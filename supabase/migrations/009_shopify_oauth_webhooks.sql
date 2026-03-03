-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 009: Shopify OAuth & Complete Integration Tables
-- ══════════════════════════════════════════════════════════════════════════════

-- Create shopify_oauth_states table
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) UNIQUE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  shop VARCHAR(255) NOT NULL,
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Create index for state lookup
CREATE INDEX idx_oauth_states_state ON shopify_oauth_states(state);
CREATE INDEX idx_oauth_states_brand ON shopify_oauth_states(brand_id);
CREATE INDEX idx_oauth_states_expires ON shopify_oauth_states(expires_at);

-- Update brands table to add new Shopify fields if not exists
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shopify_api_key VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shopify_location_id VARCHAR(255);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT FALSE;

-- Create unique index on api_key
CREATE UNIQUE INDEX idx_brands_shopify_api_key ON brands(shopify_api_key) WHERE shopify_api_key IS NOT NULL;

-- Enable RLS on oauth_states
ALTER TABLE shopify_oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_states (only backend can read/write)
CREATE POLICY "oauth_states_read" ON shopify_oauth_states
FOR SELECT USING (TRUE);

CREATE POLICY "oauth_states_insert" ON shopify_oauth_states
FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "oauth_states_delete" ON shopify_oauth_states
FOR DELETE USING (TRUE);

-- Create webhook events table (if not exists)
CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  shop VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  event_id VARCHAR(255),
  data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Create indexes for webhook events
CREATE INDEX idx_webhook_events_brand ON shopify_webhook_events(brand_id);
CREATE INDEX idx_webhook_events_topic ON shopify_webhook_events(topic);
CREATE INDEX idx_webhook_events_processed ON shopify_webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON shopify_webhook_events(created_at DESC);

-- Enable RLS on webhook_events
ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_events
CREATE POLICY "webhook_events_admin_read" ON shopify_webhook_events
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "webhook_events_brand_read" ON shopify_webhook_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_brands tb
    WHERE tb.brand_id = shopify_webhook_events.brand_id
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = tb.team_id
    )
  )
);

-- Create function to handle webhook processing
CREATE OR REPLACE FUNCTION process_shopify_webhook(
  p_brand_id UUID,
  p_topic VARCHAR,
  p_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO shopify_webhook_events (brand_id, shop, topic, data)
  SELECT $1, shopify_domain, $2, $3
  FROM brands WHERE id = $1
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark webhook as processed
CREATE OR REPLACE FUNCTION mark_webhook_processed(
  p_event_id UUID,
  p_success BOOLEAN,
  p_error_message VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE shopify_webhook_events
  SET 
    processed = TRUE,
    error_message = CASE WHEN NOT p_success THEN p_error_message ELSE NULL END,
    processed_at = NOW()
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Add columns to track sync status
ALTER TABLE brands ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'idle';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- Create sync status tracking table
CREATE TABLE IF NOT EXISTS brand_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  sync_type VARCHAR(100),
  status VARCHAR(50),
  records_synced INT,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create index for sync logs
CREATE INDEX idx_sync_logs_brand ON brand_sync_logs(brand_id);
CREATE INDEX idx_sync_logs_status ON brand_sync_logs(status);

-- Enable RLS on sync_logs
ALTER TABLE brand_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_logs (admins and team members)
CREATE POLICY "sync_logs_read" ON brand_sync_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM team_brands tb
    WHERE tb.brand_id = brand_sync_logs.brand_id
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = tb.team_id
    )
  )
);

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON shopify_oauth_states TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shopify_webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON brand_sync_logs TO authenticated;
