-- Migration 010
-- Bootstrap rule:
-- 1) First registered account becomes admin.
-- 2) Any later account defaults to staff.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_count BIGINT;
  initial_role TEXT := 'staff';
  random_color TEXT;
  display_name TEXT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  IF profile_count = 0 THEN
    initial_role := 'admin';
  END IF;

  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  random_color := (
    ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  )[floor(random() * 6 + 1)];

  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, display_name, initial_role, TRUE, random_color)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_color = COALESCE(user_profiles.avatar_color, EXCLUDED.avatar_color);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Safety net for existing projects:
-- if there is no admin yet, promote the earliest account.
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
