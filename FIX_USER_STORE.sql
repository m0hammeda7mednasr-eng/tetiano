-- ═══════════════════════════════════════════════════════════════════════════════
-- إصلاح ربط المستخدم بالـ Store
-- شغل ده بعد ما تشوف نتائج DEBUG_500_ERROR.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- الخطوة 1: شوف المستخدمين اللي مش مربوطين بـ store
SELECT 
  id,
  email,
  full_name,
  store_id
FROM user_profiles
WHERE store_id IS NULL;

-- الخطوة 2: شوف الـ stores الموجودة
SELECT id, name FROM stores;

-- الخطوة 3: لو مفيش stores، أنشئ واحد
-- (شغل ده لو مفيش stores في الخطوة 2)
INSERT INTO stores (name, created_at, updated_at)
VALUES ('متجر تيتيانو', NOW(), NOW())
RETURNING id, name;

-- الخطوة 4: اربط كل المستخدمين بأول store
-- (استبدل STORE_ID بالـ ID من الخطوة 2 أو 3)
UPDATE user_profiles 
SET store_id = 'STORE_ID_HERE'
WHERE store_id IS NULL;

-- الخطوة 5: تحقق من النجاح
SELECT 
  COUNT(*) as total_users,
  COUNT(store_id) as users_with_store,
  COUNT(*) - COUNT(store_id) as users_without_store
FROM user_profiles;

-- ═══════════════════════════════════════════════════════════════════════════════
-- البديل: استخدام store_memberships
-- ═══════════════════════════════════════════════════════════════════════════════

-- لو عايز تستخدم store_memberships بدل user_profiles.store_id:

-- 1. شوف المستخدمين اللي مش عندهم membership
SELECT 
  up.id,
  up.email,
  up.full_name
FROM user_profiles up
LEFT JOIN store_memberships sm ON sm.user_id = up.id
WHERE sm.id IS NULL;

-- 2. أنشئ membership لكل مستخدم (استبدل STORE_ID)
INSERT INTO store_memberships (user_id, store_id, store_role, status, created_at, updated_at)
SELECT 
  up.id,
  'STORE_ID_HERE',
  'admin',
  'active',
  NOW(),
  NOW()
FROM user_profiles up
LEFT JOIN store_memberships sm ON sm.user_id = up.id
WHERE sm.id IS NULL
ON CONFLICT DO NOTHING;

-- 3. تحقق من النجاح
SELECT 
  sm.id,
  up.email,
  sm.store_role,
  sm.status,
  s.name as store_name
FROM store_memberships sm
JOIN user_profiles up ON up.id = sm.user_id
JOIN stores s ON s.id = sm.store_id;
