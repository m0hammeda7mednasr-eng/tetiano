-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوات النهائية لإعداد المشروع
-- شغل كل ده في Supabase SQL Editor بالترتيب
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 1: تنظيف الـ brands المكررة
-- ═══════════════════════════════════════════════════════════════════════════════

-- شوف الـ brands الموجودة
SELECT id, name, shopify_domain, store_id FROM brands;

-- احذف كل الـ brands القديمة (لو مش محتاجها)
DELETE FROM brands WHERE shopify_domain IS NOT NULL;

-- أو احذف brand معين فقط
-- DELETE FROM brands WHERE shopify_domain = 'qpcich-gi.myshopify.com';

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 2: شغل Migration 019
-- ═══════════════════════════════════════════════════════════════════════════════

-- انسخ محتوى ملف: supabase/migrations/019_final_production_fix.sql
-- والصقه هنا وشغله

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 3: أنشئ Store
-- ═══════════════════════════════════════════════════════════════════════════════

-- شوف الـ stores الموجودة
SELECT id, name, created_at FROM stores;

-- لو مفيش stores، أنشئ واحد
INSERT INTO stores (name, created_at, updated_at)
VALUES ('متجر تيتيانو', NOW(), NOW())
RETURNING id, name;

-- انسخ الـ ID اللي ظهر واستخدمه في الخطوة التالية

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 4: اربط المستخدمين بالـ Store
-- ═══════════════════════════════════════════════════════════════════════════════

-- شوف المستخدمين الموجودين
SELECT id, email, full_name, store_id FROM user_profiles;

-- اربط كل المستخدمين بالـ store (استبدل STORE_ID)
UPDATE user_profiles 
SET store_id = 'STORE_ID_FROM_STEP_3'
WHERE store_id IS NULL;

-- أو اربط مستخدم معين فقط
-- UPDATE user_profiles 
-- SET store_id = 'STORE_ID_FROM_STEP_3'
-- WHERE email = 'your-email@example.com';

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 5: تحقق من النجاح
-- ═══════════════════════════════════════════════════════════════════════════════

-- تحقق من الجداول المطلوبة
SELECT 
  table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
  ) as exists
FROM (
  VALUES 
    ('shopify_oauth_states'),
    ('shopify_connections'),
    ('shopify_sync_runs'),
    ('stores'),
    ('brands'),
    ('user_profiles')
) AS t(table_name);

-- كل الجداول لازم تكون موجودة (exists = true)

-- تحقق من الـ stores
SELECT COUNT(*) as stores_count FROM stores;
-- لازم يكون >= 1

-- تحقق من المستخدمين
SELECT 
  COUNT(*) as total_users,
  COUNT(store_id) as users_with_store,
  COUNT(*) - COUNT(store_id) as users_without_store
FROM user_profiles;
-- users_without_store لازم يكون = 0

-- تحقق من الـ brands
SELECT COUNT(*) as brands_count FROM brands;
-- لازم يكون = 0 (مفيش brands قديمة)

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ لو كل الـ checks فوق نجحت، المشروع جاهز!
-- ═══════════════════════════════════════════════════════════════════════════════

-- الآن جرب الاتصال بـ Shopify من التطبيق:
-- 1. افتح: https://tetiano.vercel.app
-- 2. سجل دخول
-- 3. اذهب لإعدادات Shopify
-- 4. أدخل بيانات المتجر
-- 5. اضغط Connect
-- 6. لازم يشتغل بدون أخطاء!

-- ═══════════════════════════════════════════════════════════════════════════════
