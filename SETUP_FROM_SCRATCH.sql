-- ═══════════════════════════════════════════════════════════════════════════════
-- إعداد قاعدة البيانات من الصفر
-- شغل ده بعد migration 001
-- ═══════════════════════════════════════════════════════════════════════════════

-- الخطوة 1: إنشاء Store
INSERT INTO stores (name, slug, created_at, updated_at)
VALUES ('متجر تيتيانو', 'tetiano-store', NOW(), NOW())
RETURNING id, name, slug;

-- انسخ الـ ID اللي ظهر واستخدمه في الخطوة التالية

-- الخطوة 2: ربط كل المستخدمين بالـ Store
-- استبدل STORE_ID_HERE بالـ ID من الخطوة 1
UPDATE user_profiles 
SET store_id = 'STORE_ID_HERE'
WHERE TRUE;

-- الخطوة 3: التحقق من النجاح
SELECT 
  'stores' as table_name, COUNT(*) as count FROM stores
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'users_with_store', COUNT(*) FROM user_profiles WHERE store_id IS NOT NULL;

-- ✅ تم! قاعدة البيانات جاهزة
