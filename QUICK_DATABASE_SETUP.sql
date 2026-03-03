-- ═══════════════════════════════════════════════════════════
-- QUICK DATABASE SETUP
-- نسخ هذا الكود وتشغيله في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- الخطوة 1: التأكد من وجود الأعمدة المطلوبة
-- ────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#6366f1';

-- ────────────────────────────────────────────────────────────
-- الخطوة 2: تحديث القيم الموجودة
-- ────────────────────────────────────────────────────────────

UPDATE user_profiles
SET
  role = CASE
    WHEN role IN ('admin', 'manager', 'staff') THEN role
    ELSE 'staff'
  END,
  is_active = COALESCE(is_active, TRUE),
  avatar_color = COALESCE(avatar_color, '#6366f1');

-- ────────────────────────────────────────────────────────────
-- الخطوة 3: إنشاء/تحديث Trigger Function
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
  profile_count BIGINT;
  initial_role TEXT := 'staff';
  random_color TEXT;
  display_name TEXT;
BEGIN
  -- عد المستخدمين الموجودين
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  -- إذا لم يكن هناك مستخدمين، اجعل هذا المستخدم admin
  IF profile_count = 0 THEN
    initial_role := 'admin';
  END IF;

  -- الحصول على الاسم من metadata أو من البريد
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- اختيار لون عشوائي
  random_color := (
    ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  )[floor(random() * 6 + 1)];

  -- إنشاء Profile
  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, display_name, initial_role, TRUE, random_color)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_color = COALESCE(user_profiles.avatar_color, EXCLUDED.avatar_color);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث خطأ، لا تفشل التسجيل
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- الخطوة 4: إنشاء/تحديث Trigger
-- ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────
-- الخطوة 5: Safety Net - ترقية أول مستخدم إلى Admin
-- ────────────────────────────────────────────────────────────

DO $
DECLARE
  first_user_id UUID;
  admin_count BIGINT;
BEGIN
  -- عد المستخدمين الـ Admin
  SELECT COUNT(*) INTO admin_count 
  FROM user_profiles 
  WHERE role = 'admin';

  -- إذا لم يكن هناك admin، اجعل أول مستخدم admin
  IF admin_count = 0 THEN
    SELECT id INTO first_user_id
    FROM user_profiles
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      UPDATE user_profiles
      SET role = 'admin'
      WHERE id = first_user_id;
      
      RAISE NOTICE 'User % promoted to admin', first_user_id;
    END IF;
  END IF;
END $;

-- ────────────────────────────────────────────────────────────
-- الخطوة 6: تحديث RLS Policies
-- ────────────────────────────────────────────────────────────

-- حذف Policies القديمة
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;

-- إنشاء Policies جديدة
CREATE POLICY "Anyone can view active profiles"
  ON user_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Service role can manage profiles"
  ON user_profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ────────────────────────────────────────────────────────────
-- الخطوة 7: التحقق من النتيجة
-- ────────────────────────────────────────────────────────────

-- عرض جميع المستخدمين وأدوارهم
SELECT 
  id,
  full_name,
  role,
  is_active,
  avatar_color,
  created_at
FROM user_profiles
ORDER BY created_at ASC;

-- عرض إحصائيات الأدوار
SELECT 
  role,
  COUNT(*) AS users_count,
  COUNT(CASE WHEN is_active THEN 1 END) AS active_count
FROM user_profiles
GROUP BY role
ORDER BY role;

-- ────────────────────────────────────────────────────────────
-- ✅ تم الانتهاء!
-- ────────────────────────────────────────────────────────────

-- يجب أن ترى:
-- 1. جميع المستخدمين لديهم role, is_active, avatar_color
-- 2. أول مستخدم role = 'admin'
-- 3. باقي المستخدمين role = 'staff'
-- 4. Trigger يعمل بشكل صحيح

-- ────────────────────────────────────────────────────────────
-- اختبار Trigger (اختياري)
-- ────────────────────────────────────────────────────────────

-- لاختبار أن Trigger يعمل، يمكنك إنشاء مستخدم تجريبي:
-- (لا تنفذ هذا إلا إذا كنت تريد الاختبار)

/*
-- إنشاء مستخدم تجريبي
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Test User"}'::jsonb,
  NOW(),
  NOW()
);

-- تحقق من أن Profile تم إنشاؤه تلقائياً
SELECT * FROM user_profiles WHERE full_name = 'Test User';

-- حذف المستخدم التجريبي
DELETE FROM auth.users WHERE email = 'test@example.com';
*/

-- ────────────────────────────────────────────────────────────
-- ملاحظات مهمة:
-- ────────────────────────────────────────────────────────────

-- 1. أول حساب يتم تسجيله = Admin تلقائياً
-- 2. باقي الحسابات = Staff
-- 3. يمكن للـ Admin ترقية المستخدمين من لوحة التحكم
-- 4. Trigger يعمل تلقائياً عند كل تسجيل جديد
-- 5. إذا حدث خطأ في Trigger، لن يفشل التسجيل

-- ────────────────────────────────────────────────────────────
-- الخطوات التالية:
-- ────────────────────────────────────────────────────────────

-- 1. ✅ تشغيل هذا الكود في Supabase SQL Editor
-- 2. ✅ التحقق من النتائج
-- 3. ✅ اختبار التسجيل من Frontend
-- 4. ✅ التحقق من أن أول حساب = Admin

-- ────────────────────────────────────────────────────────────
-- إذا واجهت مشكلة:
-- ────────────────────────────────────────────────────────────

-- تحقق من Logs:
-- SELECT * FROM pg_stat_activity WHERE state = 'active';

-- تحقق من Triggers:
-- SELECT * FROM information_schema.triggers 
-- WHERE trigger_name = 'on_auth_user_created';

-- تحقق من Functions:
-- SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- ────────────────────────────────────────────────────────────
-- نهاية الملف
-- ────────────────────────────────────────────────────────────
