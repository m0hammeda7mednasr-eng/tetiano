-- ═══════════════════════════════════════════════════════════════════════════════
-- إنشاء Store - شغل ده الآن في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. إصلاح الـ id column (لو محتاج)
ALTER TABLE stores 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. أنشئ store مع كل الأعمدة المطلوبة
INSERT INTO stores (name, slug, created_at, updated_at)
VALUES ('متجر تيتيانو', 'tetiano-store', NOW(), NOW())
RETURNING id, name, slug;

-- انسخ الـ ID اللي ظهر واستخدمه في الخطوة التالية

-- 3. اربط كل المستخدمين بالـ store
-- استبدل STORE_ID_HERE بالـ ID من الخطوة 2
UPDATE user_profiles 
SET store_id = 'STORE_ID_HERE'
WHERE store_id IS NULL;

-- 4. احذف الـ brands المكررة
DELETE FROM brands WHERE shopify_domain IS NOT NULL;

-- 5. تحقق من النجاح
SELECT 
  COUNT(*) as total_users,
  COUNT(store_id) as users_with_store,
  COUNT(*) - COUNT(store_id) as users_without_store
FROM user_profiles;

-- لازم users_without_store = 0

-- ✅ بعد كده refresh التطبيق!
