-- ═══════════════════════════════════════════════════════════
-- Migration 007: Add per-brand Shopify API credentials
-- Each brand (store) has its own Shopify App credentials
-- ═══════════════════════════════════════════════════════════

-- Add api_key and api_secret columns to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS api_key        TEXT,
  ADD COLUMN IF NOT EXISTS api_secret     TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Add oauth_state column to shopify_oauth_states for tracking which brand/user initiated
ALTER TABLE shopify_oauth_states
  ADD COLUMN IF NOT EXISTS user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS api_key  TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT;

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON shopify_oauth_states (user_id);

-- Comment
COMMENT ON COLUMN brands.api_key IS 'Shopify App Client ID (public)';
COMMENT ON COLUMN brands.api_secret IS 'Shopify App Client Secret (private, encrypted at rest by Supabase)';
COMMENT ON COLUMN brands.webhook_secret IS 'Shopify Webhook Secret for HMAC verification';
