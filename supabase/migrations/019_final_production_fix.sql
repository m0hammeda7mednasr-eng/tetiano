-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 019: Final Production Fix
-- This migration fixes all production issues in one go
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure shopify_oauth_states table exists with correct schema
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  state TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key TEXT,
  api_secret TEXT,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_shop ON shopify_oauth_states(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_expires_at ON shopify_oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_brand_id ON shopify_oauth_states(brand_id);

-- 2. Ensure shopify_connections table exists
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
CREATE INDEX IF NOT EXISTS idx_shopify_connections_store_id ON shopify_connections(store_id);

-- 3. Ensure shopify_sync_runs table exists
CREATE TABLE IF NOT EXISTS shopify_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  run_type VARCHAR(50) NOT NULL CHECK (run_type IN ('full_import', 'incremental', 'webhook')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  summary_json JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_store_id ON shopify_sync_runs(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_status ON shopify_sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_started_at ON shopify_sync_runs(started_at DESC);

-- 4. Ensure brands table has all required Shopify columns
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS shopify_api_key TEXT,
  ADD COLUMN IF NOT EXISTS shopify_access_token TEXT,
  ADD COLUMN IF NOT EXISTS shopify_scopes TEXT,
  ADD COLUMN IF NOT EXISTS shopify_domain TEXT,
  ADD COLUMN IF NOT EXISTS shopify_location_id TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_brands_shopify_api_key ON brands(shopify_api_key);
CREATE INDEX IF NOT EXISTS idx_brands_shopify_access_token ON brands(shopify_access_token);
CREATE INDEX IF NOT EXISTS idx_brands_shopify_domain ON brands(shopify_domain);

-- 5. Ensure user_profiles has store_id column
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_store_id ON user_profiles(store_id);

-- 6. Clean up expired OAuth states
DELETE FROM shopify_oauth_states 
WHERE expires_at IS NOT NULL 
AND expires_at < NOW() - INTERVAL '1 hour';

-- 7. Sync data from brands to shopify_connections (if needed)
INSERT INTO shopify_connections (store_id, shop_domain, access_token_encrypted, scopes, connected_at, status)
SELECT
  b.id,
  COALESCE(b.shopify_domain, ''),
  COALESCE(b.shopify_access_token, b.access_token, ''),
  COALESCE(b.shopify_scopes, ''),
  b.connected_at,
  CASE 
    WHEN b.is_active = true AND b.shopify_access_token IS NOT NULL THEN 'connected'
    ELSE 'disconnected'
  END
FROM brands b
WHERE b.shopify_domain IS NOT NULL 
  AND b.shopify_domain != ''
  AND NOT EXISTS (
    SELECT 1 FROM shopify_connections sc WHERE sc.store_id = b.id
  )
ON CONFLICT (store_id) DO NOTHING;

-- 8. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Add triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopify_connections_updated_at ON shopify_connections;
CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Verify migration success
DO $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  SELECT 
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_oauth_states') AND
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_connections') AND
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_sync_runs')
  INTO tables_exist;
  
  IF tables_exist THEN
    RAISE NOTICE '✅ Migration 019 completed successfully';
  ELSE
    RAISE EXCEPTION '❌ Migration 019 failed - some tables are missing';
  END IF;
END $$;
