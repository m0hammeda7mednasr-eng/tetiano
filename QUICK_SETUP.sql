-- QUICK SETUP (minimal)
-- Use this only if schema already exists and you need bootstrap fixes quickly.

-- 1) Ensure at least one admin exists.
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

-- 2) Default missing role values to staff.
UPDATE user_profiles
SET role = 'staff'
WHERE role IS NULL;

-- 3) Show status.
SELECT role, COUNT(*) AS users_count
FROM user_profiles
GROUP BY role
ORDER BY role;
