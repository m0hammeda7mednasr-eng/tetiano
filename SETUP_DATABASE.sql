-- ═══════════════════════════════════════════════════════════════════════════════
-- Database Setup Script - Run after migration 001
-- ═══════════════════════════════════════════════════════════════════════════════

-- Step 1: Create default store
INSERT INTO stores (name, slug, description, status)
VALUES (
  'متجر تيتيانو',
  'tetiano-store',
  'المتجر الرئيسي لنظام إدارة المخزون',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW()
RETURNING id, name, slug;

-- Copy the store ID from above and use it below

-- Step 2: Link all users to the store
-- Replace 'STORE_ID_HERE' with the actual ID from Step 1
UPDATE user_profiles 
SET store_id = 'STORE_ID_HERE'
WHERE store_id IS NULL OR store_id IS NOT NULL;

-- Step 3: Verify setup
SELECT 
  'Setup Verification' as check_type,
  (SELECT COUNT(*) FROM stores) as stores_count,
  (SELECT COUNT(*) FROM user_profiles) as users_count,
  (SELECT COUNT(*) FROM user_profiles WHERE store_id IS NOT NULL) as users_with_store,
  (SELECT COUNT(*) FROM user_profiles WHERE store_id IS NULL) as users_without_store;

-- Expected results:
-- stores_count: 1
-- users_with_store: should equal users_count
-- users_without_store: 0

-- ✅ Setup complete! You can now use the application.
