-- ═══════════════════════════════════════════════════════════
-- إصلاح بسيط - شغل هذا الكود خطوة بخطوة
-- ═══════════════════════════════════════════════════════════

-- الخطوة 1: إضافة الأعمدة المطلوبة
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#6366f1';

-- الخطوة 2: تحديث المستخدمين الموجودين
UPDATE user_profiles
SET 
  role = COALESCE(role, 'user'),
  is_active = COALESCE(is_active, true),
  avatar_color = COALESCE(avatar_color, '#6366f1');

-- الخطوة 3: جعل أول مستخدم admin
UPDATE user_profiles
SET role = 'admin', is_active = true
WHERE id = (
  SELECT id FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
);

-- الخطوة 4: التحقق من النتيجة
SELECT 
  u.email,
  p.full_name,
  p.role,
  p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id;

-- ═══════════════════════════════════════════════════════════
-- ✅ تم! الآن سجل خروج وسجل دخول مرة أخرى
-- ═══════════════════════════════════════════════════════════
