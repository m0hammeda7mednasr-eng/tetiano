-- ═══════════════════════════════════════════════════════════
-- Migration 005: Shopify OAuth support
-- ═══════════════════════════════════════════════════════════

-- 1. Temp table to store OAuth nonces (auto-cleaned)
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  state       TEXT PRIMARY KEY,
  shop        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-expire states older than 1 hour (clean-up via cron or trigger)
CREATE INDEX IF NOT EXISTS idx_oauth_states_created ON shopify_oauth_states (created_at);

-- 2. Extend brands table with OAuth columns
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS access_token    TEXT,
  ADD COLUMN IF NOT EXISTS shopify_scopes  TEXT,
  ADD COLUMN IF NOT EXISTS connected_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_sync_at    TIMESTAMPTZ;

-- Make shopify_domain unique so we can upsert safely
ALTER TABLE brands
  DROP CONSTRAINT IF EXISTS brands_shopify_domain_key;

ALTER TABLE brands
  ADD CONSTRAINT brands_shopify_domain_key UNIQUE (shopify_domain);

-- Index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_brands_shopify_domain ON brands (shopify_domain);
CREATE INDEX IF NOT EXISTS idx_brands_is_active       ON brands (is_active);
