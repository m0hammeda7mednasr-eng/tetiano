-- Migration 013
-- Ensure self-signup accounts are admins by default.
-- Staff accounts should be created by existing admins from the admin panel.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_color TEXT;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  random_color := (
    ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  )[floor(random() * 6 + 1)];

  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, display_name, 'admin', TRUE, random_color)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
    role = COALESCE(user_profiles.role, 'admin'),
    is_active = COALESCE(user_profiles.is_active, TRUE),
    avatar_color = COALESCE(user_profiles.avatar_color, EXCLUDED.avatar_color),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
