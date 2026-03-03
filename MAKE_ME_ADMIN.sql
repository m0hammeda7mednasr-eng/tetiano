-- ═══════════════════════════════════════════════════════════
-- اجعلني Admin! 🔐
-- ═══════════════════════════════════════════════════════════

-- الطريقة 1: إذا كنت تعرف الإيميل بتاعك
-- غير الإيميل هنا ↓
UPDATE user_profiles
SET role = 'admin', is_active = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'YOUR_EMAIL_HERE@example.com'  -- ضع إيميلك هنا
);

-- ═══════════════════════════════════════════════════════════

-- الطريقة 2: اجعل آخر مستخدم سجل admin
UPDATE user_profiles
SET role = 'admin', is_active = true
WHERE id = (
  SELECT id FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1
);

-- ═══════════════════════════════════════════════════════════

-- الطريقة 3: اجعل أول مستخدم admin
UPDATE user_profiles
SET role = 'admin', is_active = true
WHERE id = (
  SELECT id FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
);

-- ═══════════════════════════════════════════════════════════

-- للتحقق: شوف كل المستخدمين ودورهم
SELECT 
  u.email,
  p.full_name,
  p.role,
  p.is_active,
  u.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════
-- بعد ما تشغل الكود:
-- 1. سجل خروج من التطبيق
-- 2. سجل دخول تاني
-- 3. روح على: http://localhost:5173/admin/dashboard
-- ═══════════════════════════════════════════════════════════
