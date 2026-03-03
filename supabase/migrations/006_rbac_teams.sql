-- ════════════════════════════════════════════════════════════
-- Migration 006: Full Role-Based Access Control (RBAC)
-- ════════════════════════════════════════════════════════════

-- ── Extend profiles table ────────────────────────────────
-- Roles: admin | manager | staff
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role         TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','manager','staff')),
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_role      ON user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON user_profiles (is_active);

-- ── Teams ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams (is_active);

-- ── Team members (many-to-many) ──────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

-- ── Team permissions ─────────────────────────────────────
-- Each team can have granular ON/OFF permissions
CREATE TABLE IF NOT EXISTS team_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  can_view_inventory    BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_inventory    BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_orders       BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_reports      BOOLEAN NOT NULL DEFAULT TRUE,
  can_submit_reports    BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_settings     BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_team       BOOLEAN NOT NULL DEFAULT FALSE,
  brands_access         TEXT[]  DEFAULT '{}',   -- array of brand IDs they can access
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Daily reports (ensure team_id is present) ────────────
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- ── Team report summary view ────────────────────────────
CREATE OR REPLACE VIEW team_report_summary AS
SELECT
  t.id                                AS team_id,
  t.name                              AS team_name,
  COUNT(DISTINCT tm.user_id)          AS member_count,
  COUNT(dr.id)                        AS total_reports,
  COUNT(CASE WHEN dr.created_at::date = CURRENT_DATE THEN 1 END) AS reports_today,
  MAX(dr.created_at)                  AS last_report_at
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
LEFT JOIN daily_reports dr ON dr.team_id = t.id
WHERE t.is_active = TRUE
GROUP BY t.id, t.name;

-- ── RLS Policies ─────────────────────────────────────────
-- Enable RLS on sensitive tables
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;

-- Admins see everything, others see only their teams
CREATE POLICY "admins_all_teams" ON teams FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_see_own_teams" ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "admins_all_members" ON team_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_see_own_membership" ON team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admins_all_permissions" ON team_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "team_members_see_permissions" ON team_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members WHERE team_id = team_permissions.team_id AND user_id = auth.uid()
    )
  );
