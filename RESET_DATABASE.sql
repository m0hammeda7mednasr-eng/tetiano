-- ═══════════════════════════════════════════════════════════════════════════════
-- إعادة تعيين قاعدة البيانات - ابدأ من الصفر
-- ⚠️ تحذير: ده هيمسح كل البيانات! استخدمه بحذر
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 1: مسح كل البيانات (مش الجداول نفسها)
-- ═══════════════════════════════════════════════════════════════════════════════

-- مسح بيانات Shopify
TRUNCATE TABLE shopify_oauth_states CASCADE;
TRUNCATE TABLE shopify_connections CASCADE;
TRUNCATE TABLE shopify_sync_runs CASCADE;
TRUNCATE TABLE shopify_webhooks CASCADE;

-- مسح بيانات Orders & Inventory
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE inventory CASCADE;
TRUNCATE TABLE products CASCADE;

-- مسح بيانات Reports
TRUNCATE TABLE daily_reports CASCADE;
TRUNCATE TABLE report_submissions CASCADE;

-- مسح بيانات Brands & Stores
TRUNCATE TABLE brands CASCADE;
TRUNCATE TABLE stores CASCADE;

-- مسح بيانات Users (اختياري - لو عايز تحتفظ بالمستخدمين، احذف السطر ده)
-- TRUNCATE TABLE store_memberships CASCADE;
-- TRUNCATE TABLE store_permissions_overrides CASCADE;
-- TRUNCATE TABLE user_profiles CASCADE;

-- مسح Audit logs
TRUNCATE TABLE audit_logs CASCADE;

-- مسح Notifications
TRUNCATE TABLE notifications CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 2: إصلاح الـ stores table
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE stores 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 3: إنشاء Store جديد
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO stores (name, slug, created_at, updated_at)
VALUES ('متجر تيتيانو', 'tetiano-store', NOW(), NOW())
RETURNING id, name, slug;

-- انسخ الـ ID اللي ظهر

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 4: ربط المستخدمين بالـ Store الجديد
-- استبدل STORE_ID_HERE بالـ ID من الخطوة 3
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE user_profiles 
SET store_id = 'STORE_ID_HERE'
WHERE store_id IS NULL OR store_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- الخطوة 5: التحقق من النجاح
-- ═══════════════════════════════════════════════════════════════════════════════

-- تحقق من الـ stores
SELECT id, name, slug, created_at FROM stores;

-- تحقق من المستخدمين
SELECT id, email, full_name, store_id FROM user_profiles;

-- تحقق من عدد السجلات
SELECT 
  'stores' as table_name, COUNT(*) as count FROM stores
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ تم! قاعدة البيانات نظيفة وجاهزة
-- ═══════════════════════════════════════════════════════════════════════════════

-- الآن:
-- 1. Refresh التطبيق
-- 2. سجل دخول
-- 3. جرب الاتصال بـ Shopify
-- 4. كل حاجة هتشتغل من أول مرة!
