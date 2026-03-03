-- FINAL SETUP
-- Run after migrations to prepare production-safe defaults.

BEGIN;

-- Create a default team if none exists.
INSERT INTO teams (name, description, color, is_active)
SELECT 'الفريق الرئيسي', 'الفريق الافتراضي للنظام', '#6366f1', TRUE
WHERE NOT EXISTS (SELECT 1 FROM teams);

-- Ensure every active team has permissions row.
INSERT INTO team_permissions (
  team_id,
  can_view_inventory,
  can_edit_inventory,
  can_view_orders,
  can_view_reports,
  can_submit_reports,
  can_view_settings,
  can_manage_team
)
SELECT
  t.id,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE
FROM teams t
LEFT JOIN team_permissions tp ON tp.team_id = t.id
WHERE tp.team_id IS NULL;

-- Ensure first-admin bootstrap policy is applied.
-- (This file expects handle_new_user from COMPLETE_FIX.sql / migration 010)
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE role = 'admin') THEN
    SELECT id INTO first_user_id
    FROM user_profiles
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      UPDATE user_profiles
      SET role = 'admin'
      WHERE id = first_user_id;
    END IF;
  END IF;
END $$;

COMMIT;

-- Quick checks
SELECT 'users' AS table_name, COUNT(*) AS count FROM user_profiles
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'team_permissions', COUNT(*) FROM team_permissions;
