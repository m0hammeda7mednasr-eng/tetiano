-- Migration 015: Shopify schema compatibility for mixed deployments
-- Ensures OAuth endpoints work whether the project uses legacy or newer brand columns.

-- Ensure base OAuth state table exists (legacy minimal schema).
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  state TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add optional OAuth metadata columns used by newer backend flows.
ALTER TABLE shopify_oauth_states
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_shop ON shopify_oauth_states(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_expires_at ON shopify_oauth_states(expires_at);

-- Ensure brands table has both legacy and newer Shopify credential columns.
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS shopify_api_key TEXT,
  ADD COLUMN IF NOT EXISTS shopify_access_token TEXT,
  ADD COLUMN IF NOT EXISTS shopify_scopes TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill both directions so legacy/new code paths can read credentials safely.
UPDATE brands
SET shopify_access_token = access_token
WHERE shopify_access_token IS NULL
  AND access_token IS NOT NULL;

UPDATE brands
SET access_token = shopify_access_token
WHERE access_token IS NULL
  AND shopify_access_token IS NOT NULL;

UPDATE brands
SET shopify_api_key = api_key
WHERE shopify_api_key IS NULL
  AND api_key IS NOT NULL;

UPDATE brands
SET api_key = shopify_api_key
WHERE api_key IS NULL
  AND shopify_api_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_shopify_api_key ON brands(shopify_api_key);
CREATE INDEX IF NOT EXISTS idx_brands_shopify_access_token ON brands(shopify_access_token);

