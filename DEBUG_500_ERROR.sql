-- ═══════════════════════════════════════════════════════════════════════════════
-- Debug Query للخطأ 500
-- شغل ده في Supabase SQL Editor عشان نعرف المشكلة
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. تحقق من وجود الجداول المطلوبة
SELECT 
  'shopify_oauth_states' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'shopify_oauth_states'
  ) as exists
UNION ALL
SELECT 
  'shopify_connections' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'shopify_connections'
  ) as exists
UNION ALL
SELECT 
  'stores' as table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stores'
  ) as exists;

-- 2. تحقق من schema جدول shopify_oauth_states
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shopify_oauth_states'
ORDER BY ordinal_position;

-- 3. تحقق من المستخدمين وهل عندهم store_id
SELECT 
  id,
  email,
  full_name,
  store_id,
  CASE 
    WHEN store_id IS NULL THEN '❌ مش مربوط بـ store'
    ELSE '✅ مربوط بـ store'
  END as status
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 4. تحقق من الـ stores الموجودة
SELECT 
  id,
  name,
  created_at,
  (SELECT COUNT(*) FROM user_profiles WHERE store_id = stores.id) as users_count
FROM stores
ORDER BY created_at DESC;

-- 5. تحقق من store_memberships
SELECT 
  sm.id,
  sm.user_id,
  sm.store_id,
  sm.store_role,
  sm.status,
  up.email,
  s.name as store_name
FROM store_memberships sm
LEFT JOIN user_profiles up ON up.id = sm.user_id
LEFT JOIN stores s ON s.id = sm.store_id
ORDER BY sm.created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════════
-- النتائج المتوقعة:
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. كل الجداول لازم تكون موجودة (exists = true)
-- 2. shopify_oauth_states لازم يكون فيه الأعمدة: state, shop, brand_id, user_id, api_key, api_secret, expires_at
-- 3. المستخدمين لازم يكون عندهم store_id
-- 4. لازم يكون في store واحد على الأقل
-- ═══════════════════════════════════════════════════════════════════════════════
