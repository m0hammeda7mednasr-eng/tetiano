-- Emergency Production Schema Fix
-- Run this on Supabase SQL Editor to fix 400 errors

-- 1. Ensure stores table exists
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Backfill stores from brands if empty
INSERT INTO stores (id, name, slug, created_at, updated_at)
SELECT
  b.id,
  COALESCE(NULLIF(b.name, ''), 'Store'),
  LOWER(REGEXP_REPLACE(COALESCE(NULLIF(b.name, ''), 'store'), '[^a-zA-Z0-9]+', '-', 'g')),
  COALESCE(b.created_at, NOW()),
  COALESCE(b.updated_at, NOW())
FROM brands b
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id = b.id)
ON CONFLICT (id) DO NOTHING;

-- 3. Fix slug uniqueness
WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM stores
)
UPDATE stores s
SET slug = CASE 
  WHEN r.rn = 1 THEN r.slug 
  ELSE r.slug || '-' || SUBSTRING(REPLACE(s.id::text, '-', ''), 1, 6) 
END
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

-- 4. Add store_id to user_profiles if missing
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- 5. Backfill user_profiles.store_id from primary_brand_id (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'primary_brand_id'
  ) THEN
    UPDATE user_profiles
    SET store_id = primary_brand_id
    WHERE store_id IS NULL AND primary_brand_id IS NOT NULL;
  END IF;
END $$;

-- 5b. If no primary_brand_id, assign first available store to users without store_id
UPDATE user_profiles up
SET store_id = (SELECT id FROM stores LIMIT 1)
WHERE store_id IS NULL
  AND EXISTS (SELECT 1 FROM stores);

-- 6. Create store_memberships table
CREATE TABLE IF NOT EXISTS store_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_role VARCHAR(30) NOT NULL CHECK (store_role IN ('admin', 'manager', 'staff', 'viewer')),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 7. Backfill store_memberships from user_profiles
INSERT INTO store_memberships (store_id, user_id, store_role, status)
SELECT
  up.store_id,
  up.id,
  CASE
    WHEN up.role IN ('owner', 'admin') THEN 'admin'
    WHEN up.role = 'manager' THEN 'manager'
    WHEN up.role = 'viewer' THEN 'viewer'
    ELSE 'staff'
  END,
  CASE WHEN COALESCE(up.is_active, TRUE) THEN 'active' ELSE 'inactive' END
FROM user_profiles up
WHERE up.store_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 8. Set admin_user_id for stores
UPDATE stores s
SET admin_user_id = sm.user_id
FROM store_memberships sm
WHERE sm.store_id = s.id
  AND sm.store_role = 'admin'
  AND sm.status = 'active'
  AND s.admin_user_id IS NULL;

-- 9. Add store_id to core tables if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE variants ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE inventory_levels ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE shopify_customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- 10. Backfill store_id from brand_id
UPDATE products SET store_id = brand_id WHERE store_id IS NULL AND brand_id IS NOT NULL;
UPDATE variants SET store_id = brand_id WHERE store_id IS NULL AND brand_id IS NOT NULL;
UPDATE inventory_levels SET store_id = brand_id WHERE store_id IS NULL AND brand_id IS NOT NULL;
UPDATE shopify_orders SET store_id = brand_id WHERE store_id IS NULL AND brand_id IS NOT NULL;
UPDATE shopify_customers SET store_id = brand_id WHERE store_id IS NULL AND brand_id IS NOT NULL;

-- 11. Create shopify_connections table
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  access_token_encrypted TEXT NOT NULL DEFAULT '',
  scopes TEXT,
  connected_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'disconnected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Backfill shopify_connections from brands
INSERT INTO shopify_connections (store_id, shop_domain, access_token_encrypted, scopes, connected_at, status)
SELECT
  b.id,
  COALESCE(b.shopify_domain, ''),
  COALESCE(b.shopify_access_token, b.access_token, ''),
  COALESCE(b.shopify_scopes, ''),
  b.connected_at,
  CASE
    WHEN COALESCE(b.shopify_access_token, b.access_token, '') <> '' THEN 'connected'
    ELSE 'disconnected'
  END
FROM brands b
WHERE COALESCE(b.shopify_domain, '') <> ''
ON CONFLICT (store_id) DO NOTHING;

-- 13. Add store_id to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Backfill notifications.store_id
UPDATE notifications n
SET store_id = up.store_id
FROM user_profiles up
WHERE n.user_id = up.id
  AND n.store_id IS NULL
  AND up.store_id IS NOT NULL;

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_admin_user_id ON stores(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_store_memberships_store ON store_memberships(store_id);
CREATE INDEX IF NOT EXISTS idx_store_memberships_user ON store_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_variants_store_id ON variants(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_store_id ON inventory_levels(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store_id ON shopify_customers(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_store_user_read ON notifications(store_id, user_id, is_read);

-- Done! Schema should now be compatible with the new backend routes.
