-- Migration 017: Store-per-tenant V2 foundation
-- This migration introduces a strict store context while preserving existing data.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Canonical stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_user_id);

-- Backfill stores from brands. We intentionally reuse brand IDs to avoid remapping.
INSERT INTO stores (id, name, slug, created_at, updated_at)
SELECT
  b.id,
  COALESCE(NULLIF(b.name, ''), 'store_' || SUBSTRING(REPLACE(b.id::text, '-', ''), 1, 8)),
  LOWER(REGEXP_REPLACE(COALESCE(NULLIF(b.name, ''), 'store_' || SUBSTRING(REPLACE(b.id::text, '-', ''), 1, 8)), '[^a-zA-Z0-9]+', '-', 'g')),
  COALESCE(b.created_at, NOW()),
  COALESCE(b.updated_at, NOW())
FROM brands b
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Ensure slug uniqueness after backfill collisions.
WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM stores
)
UPDATE stores s
SET slug = CASE WHEN r.rn = 1 THEN r.slug ELSE r.slug || '-' || SUBSTRING(REPLACE(s.id::text, '-', ''), 1, 6) END
FROM ranked r
WHERE s.id = r.id;

-- 2) User profile platform/store fields
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS platform_role VARCHAR(30) NOT NULL DEFAULT 'user' CHECK (platform_role IN ('super_admin', 'user')),
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_platform_role ON user_profiles(platform_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);

-- Backfill user_profiles.store_id from primary_brand_id if available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'primary_brand_id'
  ) THEN
    EXECUTE '
      UPDATE user_profiles
      SET store_id = primary_brand_id
      WHERE store_id IS NULL
        AND primary_brand_id IS NOT NULL
    ';
  END IF;
END $$;

-- 3) Store memberships (strict single-store membership per user)
CREATE TABLE IF NOT EXISTS store_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_role VARCHAR(30) NOT NULL CHECK (store_role IN ('owner', 'admin', 'manager', 'staff', 'viewer')),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, user_id),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_memberships_store ON store_memberships(store_id);
CREATE INDEX IF NOT EXISTS idx_store_memberships_user ON store_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_store_memberships_role ON store_memberships(store_role);

-- Backfill memberships from user_profiles.
INSERT INTO store_memberships (store_id, user_id, store_role, status)
SELECT
  up.store_id,
  up.id,
  CASE
    WHEN up.role IN ('owner') THEN 'owner'
    WHEN up.role IN ('admin') THEN 'admin'
    WHEN up.role IN ('manager') THEN 'manager'
    WHEN up.role IN ('viewer') THEN 'viewer'
    ELSE 'staff'
  END,
  CASE WHEN COALESCE(up.is_active, TRUE) THEN 'active' ELSE 'inactive' END
FROM user_profiles up
WHERE up.store_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET
  store_id = EXCLUDED.store_id,
  store_role = EXCLUDED.store_role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Promote one owner per store if none exists.
WITH owner_missing AS (
  SELECT s.id AS store_id
  FROM stores s
  LEFT JOIN store_memberships sm
    ON sm.store_id = s.id
   AND sm.store_role = 'owner'
   AND sm.status = 'active'
  GROUP BY s.id
  HAVING COUNT(sm.id) = 0
),
first_member AS (
  SELECT DISTINCT ON (sm.store_id)
    sm.id,
    sm.store_id
  FROM store_memberships sm
  JOIN owner_missing om ON om.store_id = sm.store_id
  WHERE sm.status = 'active'
  ORDER BY sm.store_id, sm.created_at ASC
)
UPDATE store_memberships sm
SET store_role = 'owner', updated_at = NOW()
FROM first_member fm
WHERE sm.id = fm.id;

-- Set stores.owner_user_id from owner membership.
UPDATE stores s
SET owner_user_id = sm.user_id
FROM store_memberships sm
WHERE sm.store_id = s.id
  AND sm.store_role = 'owner'
  AND sm.status = 'active'
  AND (s.owner_user_id IS NULL OR s.owner_user_id <> sm.user_id);

-- 4) Permission overrides (fine-grained)
CREATE TABLE IF NOT EXISTS store_permissions_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES store_memberships(id) ON DELETE CASCADE,
  permission_key VARCHAR(120) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(membership_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_store_permissions_membership ON store_permissions_overrides(membership_id);

-- 5) Add store_id to core commerce tables and backfill from brand_id
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE variants ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE inventory_levels ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

UPDATE products SET store_id = brand_id WHERE store_id IS NULL;
UPDATE variants SET store_id = brand_id WHERE store_id IS NULL;
UPDATE inventory_levels SET store_id = brand_id WHERE store_id IS NULL;
UPDATE stock_movements SET store_id = brand_id WHERE store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_variants_store_id ON variants(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_store_id ON inventory_levels(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store_id ON stock_movements(store_id);

ALTER TABLE shopify_customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE shopify_webhook_events ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

UPDATE shopify_customers SET store_id = brand_id WHERE store_id IS NULL;
UPDATE shopify_orders SET store_id = brand_id WHERE store_id IS NULL;
UPDATE shopify_webhook_events SET store_id = brand_id WHERE store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_customers_store_id ON shopify_customers(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_store_id ON shopify_webhook_events(store_id);

-- 6) Shopify dedicated connection + job tables
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL UNIQUE,
  access_token_encrypted TEXT NOT NULL DEFAULT '',
  scopes TEXT,
  connected_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_connections_status ON shopify_connections(status);

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
ON CONFLICT (store_id) DO UPDATE
SET
  shop_domain = EXCLUDED.shop_domain,
  scopes = EXCLUDED.scopes,
  connected_at = EXCLUDED.connected_at,
  status = EXCLUDED.status,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS shopify_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  job_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_jobs_store_status ON shopify_sync_jobs(store_id, status, run_after);

CREATE TABLE IF NOT EXISTS shopify_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  run_type VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_store_started ON shopify_sync_runs(store_id, started_at DESC);

-- 7) Finance tables
CREATE TABLE IF NOT EXISTS order_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
  cost DECIMAL(14, 2) NOT NULL DEFAULT 0,
  fees DECIMAL(14, 2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_financials_store ON order_financials(store_id);

-- 8) Reports media model
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  body_text TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_store_date ON reports(store_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_author ON reports(author_user_id);

CREATE TABLE IF NOT EXISTS report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_type VARCHAR(30) NOT NULL CHECK (file_type IN ('image', 'audio', 'file')),
  mime_type VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON report_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_attachments_store ON report_attachments(store_id);

CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_comments_report ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_store ON report_comments(store_id);

-- 9) Notifications normalization: is_read as canonical
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill body/is_read/store_id.
UPDATE notifications
SET
  body = COALESCE(body, message),
  is_read = COALESCE(is_read, read, FALSE)
WHERE body IS NULL
   OR is_read IS NULL;

UPDATE notifications n
SET store_id = up.store_id
FROM user_profiles up
WHERE n.user_id = up.id
  AND n.store_id IS NULL
  AND up.store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_store_user_read ON notifications(store_id, user_id, is_read);

-- 10) Optional bridge from daily_reports to new reports model
INSERT INTO reports (store_id, author_user_id, report_date, body_text, status, created_at, updated_at)
SELECT
  COALESCE(up.store_id, dr.brand_id),
  dr.user_id,
  COALESCE(dr.report_date, (dr.created_at AT TIME ZONE 'UTC')::date),
  CONCAT(
    'Done: ', COALESCE(dr.done_today, ''),
    E'\n\nBlockers: ', COALESCE(dr.blockers, ''),
    E'\n\nPlan: ', COALESCE(dr.plan_tomorrow, '')
  ),
  'submitted',
  COALESCE(dr.created_at, NOW()),
  COALESCE(dr.updated_at, NOW())
FROM daily_reports dr
LEFT JOIN user_profiles up ON up.id = dr.user_id
WHERE COALESCE(up.store_id, dr.brand_id) IS NOT NULL
ON CONFLICT DO NOTHING;

