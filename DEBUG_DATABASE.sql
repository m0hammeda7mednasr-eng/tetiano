-- Debug Script: Check Database Schema
-- Run this in Supabase SQL Editor to diagnose issues

-- 1. Check if tables exist
SELECT 
  tablename, 
  schemaname,
  CASE 
    WHEN schemaname = 'public' THEN '✓'
    ELSE '✗'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Expected tables count
SELECT 
  COUNT(*) as total_tables,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as actual_count
FROM pg_tables 
WHERE schemaname = 'public';

-- 3. Check specific critical tables
SELECT 'stores' as table_name, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'stores' AND table_schema = 'public'
) as exists;

SELECT 'store_memberships' as table_name, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'store_memberships' AND table_schema = 'public'
) as exists;

SELECT 'user_profiles' as table_name, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'user_profiles' AND table_schema = 'public'
) as exists;

SELECT 'variants' as table_name, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'variants' AND table_schema = 'public'
) as exists;

SELECT 'inventory_levels' as table_name, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'inventory_levels' AND table_schema = 'public'
) as exists;

-- 4. If tables exist, check row counts
SELECT 'stores' as table_name, COUNT(*) as row_count FROM stores UNION ALL
SELECT 'store_memberships', COUNT(*) FROM store_memberships UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles UNION ALL
SELECT 'products', COUNT(*) FROM products UNION ALL
SELECT 'variants', COUNT(*) FROM variants UNION ALL
SELECT 'inventory_levels', COUNT(*) FROM inventory_levels;

-- 5. Check user_profiles for current users
SELECT id, email, full_name, store_id, is_active FROM user_profiles LIMIT 10;

-- 6. To manually fix: Create default store for users without one
-- DO THIS IF NEEDED:
-- INSERT INTO stores (id, name, slug, admin_user_id, status)
-- SELECT 
--   gen_random_uuid(),
--   COALESCE(full_name || '''s Store', email || '''s Store', 'Default Store'),
--   'default-store-' || LEFT(gen_random_uuid()::text, 8),
--   id,
--   'active'
-- FROM user_profiles
-- WHERE store_id IS NULL
-- LIMIT 1;
