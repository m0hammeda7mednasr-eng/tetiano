-- Migration 004: Add last_sync_at to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Update last_sync_at when sync happens (can be updated via API)
COMMENT ON COLUMN brands.last_sync_at IS 'Timestamp of the last successful Shopify sync';
