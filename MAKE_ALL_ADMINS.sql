-- ═══════════════════════════════════════════════════════════
-- جعل كل المستخدمين Admins تلقائياً
-- ═══════════════════════════════════════════════════════════

-- 1. تحديث الـ trigger ليخلي كل حساب جديد Admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
  user_full_name TEXT;
  random_color TEXT;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  random_color := (ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'])[floor(random() * 6 + 1)];
  
  -- كل حساب جديد يبقى Admin تلقائياً
  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, user_full_name, 'admin', true, random_color)
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', is_active = true;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تحديث كل المستخدمين الموجودين ليكونوا Admins
UPDATE user_profiles
SET role = 'admin', is_active = true;

-- 3. التحقق
SELECT 
  u.email,
  p.full_name,
  p.role,
  p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
ORDER BY u.created_at;

-- ═══════════════════════════════════════════════════════════
-- ✅ تم! الآن كل حساب جديد هيبقى Admin تلقائياً
-- ═══════════════════════════════════════════════════════════
