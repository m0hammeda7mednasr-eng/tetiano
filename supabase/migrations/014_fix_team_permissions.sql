-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 014: Fix team_permissions table
-- ══════════════════════════════════════════════════════════════════════════════

-- Create team_permissions table if not exists
CREATE TABLE IF NOT EXISTS team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  can_view_inventory BOOLEAN DEFAULT true,
  can_edit_inventory BOOLEAN DEFAULT false,
  can_view_orders BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT true,
  can_submit_reports BOOLEAN DEFAULT true,
  can_view_settings BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  brands_access JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_team_permissions_team_id ON team_permissions(team_id);

-- Enable RLS
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "team_permissions_read" ON team_permissions;
CREATE POLICY "team_permissions_read" ON team_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_permissions.team_id
    AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "team_permissions_admin_write" ON team_permissions;
CREATE POLICY "team_permissions_admin_write" ON team_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert default permissions for existing teams without permissions
INSERT INTO team_permissions (team_id, can_view_inventory, can_edit_inventory, can_view_orders, can_view_reports, can_submit_reports)
SELECT 
  t.id,
  true,
  false,
  true,
  true,
  true
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM team_permissions tp WHERE tp.team_id = t.id
)
ON CONFLICT (team_id) DO NOTHING;
