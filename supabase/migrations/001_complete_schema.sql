-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 001: Complete Database Schema - Professional Edition
-- This creates a clean, production-ready database from scratch
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ═══════════════════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. STORES TABLE
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_status ON stores(status);

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  avatar_color VARCHAR(7) DEFAULT '#3B82F6',
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_store_id ON user_profiles(store_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- 3. STORE MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS store_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  store_role VARCHAR(50) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_store_memberships_user_id ON store_memberships(user_id);
CREATE INDEX idx_store_memberships_store_id ON store_memberships(store_id);
CREATE INDEX idx_store_memberships_status ON store_memberships(status);

-- 4. STORE PERMISSIONS OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS store_permissions_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES store_memberships(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(membership_id, permission_key)
);

CREATE INDEX idx_store_permissions_membership ON store_permissions_overrides(membership_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SHOPIFY INTEGRATION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 5. BRANDS TABLE (Legacy compatibility - maps to stores)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  shopify_domain VARCHAR(255) UNIQUE,
  shopify_api_key TEXT,
  shopify_access_token TEXT,
  shopify_scopes TEXT,
  shopify_location_id TEXT,
  webhook_secret TEXT,
  connected_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_configured BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_store_id ON brands(store_id);
CREATE INDEX idx_brands_shopify_domain ON brands(shopify_domain);
CREATE INDEX idx_brands_is_active ON brands(is_active);

-- 6. SHOPIFY OAUTH STATES TABLE
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  state TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key TEXT,
  api_secret TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopify_oauth_states_shop ON shopify_oauth_states(shop);
CREATE INDEX idx_shopify_oauth_states_expires_at ON shopify_oauth_states(expires_at);
CREATE INDEX idx_shopify_oauth_states_store_id ON shopify_oauth_states(store_id);

-- 7. SHOPIFY CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL UNIQUE,
  access_token_encrypted TEXT NOT NULL DEFAULT '',
  scopes TEXT,
  connected_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopify_connections_store_id ON shopify_connections(store_id);
CREATE INDEX idx_shopify_connections_status ON shopify_connections(status);
CREATE INDEX idx_shopify_connections_shop_domain ON shopify_connections(shop_domain);

-- 8. SHOPIFY SYNC RUNS TABLE
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

CREATE INDEX idx_shopify_sync_runs_store_id ON shopify_sync_runs(store_id);
CREATE INDEX idx_shopify_sync_runs_status ON shopify_sync_runs(status);
CREATE INDEX idx_shopify_sync_runs_started_at ON shopify_sync_runs(started_at DESC);

-- 9. SHOPIFY WEBHOOKS TABLE
CREATE TABLE IF NOT EXISTS shopify_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  topic VARCHAR(100) NOT NULL,
  shopify_webhook_id BIGINT UNIQUE,
  address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopify_webhooks_store_id ON shopify_webhooks(store_id);
CREATE INDEX idx_shopify_webhooks_topic ON shopify_webhooks(topic);
CREATE INDEX idx_shopify_webhooks_is_active ON shopify_webhooks(is_active);

-- 10. SHOPIFY WEBHOOK EVENTS TABLE (for idempotency)
CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  webhook_id TEXT NOT NULL UNIQUE,
  topic VARCHAR(100) NOT NULL,
  shop_domain VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shopify_webhook_events_store_id ON shopify_webhook_events(store_id);
CREATE INDEX idx_shopify_webhook_events_webhook_id ON shopify_webhook_events(webhook_id);
CREATE INDEX idx_shopify_webhook_events_status ON shopify_webhook_events(status);
CREATE INDEX idx_shopify_webhook_events_received_at ON shopify_webhook_events(received_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRODUCT & INVENTORY TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 11. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(255),
  shopify_product_id BIGINT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_shopify_product_id ON products(shopify_product_id);
CREATE INDEX idx_products_is_active ON products(is_active);

-- 12. VARIANTS TABLE (Product variants)
CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku VARCHAR(255),
  title VARCHAR(255),
  option1 VARCHAR(255),
  option2 VARCHAR(255),
  option3 VARCHAR(255),
  price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2),
  shopify_variant_id BIGINT UNIQUE,
  barcode VARCHAR(255),
  weight DECIMAL(10, 2),
  weight_unit VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_product_id ON variants(product_id);
CREATE INDEX idx_variants_store_id ON variants(store_id);
CREATE INDEX idx_variants_sku ON variants(sku);
CREATE INDEX idx_variants_shopify_variant_id ON variants(shopify_variant_id);

-- 13. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  last_counted_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id)
);

CREATE INDEX idx_inventory_store_id ON inventory(store_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_variant_id ON inventory(variant_id);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);

-- 14. INVENTORY LEVELS TABLE (Shopify locations)
CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  location_id BIGINT NOT NULL,
  available INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, variant_id, location_id)
);

CREATE INDEX idx_inventory_levels_store_id ON inventory_levels(store_id);
CREATE INDEX idx_inventory_levels_variant_id ON inventory_levels(variant_id);
CREATE INDEX idx_inventory_levels_location_id ON inventory_levels(location_id);

-- 15. STOCK MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(255),
  reference_type VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_store_id ON stock_movements(store_id);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_variant_id ON stock_movements(variant_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORDER TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 16. SHOPIFY CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_customer_id BIGINT NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, shopify_customer_id)
);

CREATE INDEX idx_shopify_customers_store_id ON shopify_customers(store_id);
CREATE INDEX idx_shopify_customers_shopify_id ON shopify_customers(shopify_customer_id);
CREATE INDEX idx_shopify_customers_email ON shopify_customers(email);

-- 17. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number VARCHAR(255) NOT NULL,
  shopify_order_id BIGINT UNIQUE,
  customer_id UUID REFERENCES shopify_customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  total_amount DECIMAL(10, 2),
  subtotal_amount DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  shipping_amount DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  financial_status VARCHAR(50),
  fulfillment_status VARCHAR(50),
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, order_number)
);

CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_shopify_order_id ON orders(shopify_order_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date DESC);

-- 18. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  sku VARCHAR(255),
  name VARCHAR(500),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORTING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 19. DAILY REPORTS TABLE
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  low_stock_count INTEGER DEFAULT 0,
  out_of_stock_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_date)
);

CREATE INDEX idx_daily_reports_store_id ON daily_reports(store_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);

-- 20. REPORT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_submissions_store_id ON report_submissions(store_id);
CREATE INDEX idx_report_submissions_user_id ON report_submissions(user_id);
CREATE INDEX idx_report_submissions_date ON report_submissions(report_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SYSTEM TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 21. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- 22. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_memberships_updated_at BEFORE UPDATE ON store_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_connections_updated_at BEFORE UPDATE ON shopify_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_webhooks_updated_at BEFORE UPDATE ON shopify_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_levels_updated_at BEFORE UPDATE ON inventory_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_customers_updated_at BEFORE UPDATE ON shopify_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup expired OAuth states (runs daily at 2 AM)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM shopify_oauth_states
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-oauth-states', '0 2 * * *', 'SELECT cleanup_expired_oauth_states()');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, skip scheduling
    NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_permissions_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for backend API)
CREATE POLICY "Service role bypass" ON stores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON user_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON store_memberships FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON store_permissions_overrides FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON brands FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON shopify_oauth_states FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON shopify_connections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON shopify_sync_runs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON shopify_webhooks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON shopify_webhook_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON variants FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON inventory FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON inventory_levels FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON stock_movements FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON shopify_customers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON order_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON daily_reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON report_submissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON audit_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role bypass" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- User policies
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'stores', 'user_profiles', 'store_memberships', 'store_permissions_overrides',
    'brands', 'shopify_oauth_states', 'shopify_connections', 'shopify_sync_runs',
    'shopify_webhooks', 'shopify_webhook_events', 'products', 'variants',
    'inventory', 'inventory_levels', 'stock_movements', 'shopify_customers',
    'orders', 'order_items', 'daily_reports', 'report_submissions',
    'audit_logs', 'notifications'
  );
  
  IF table_count >= 22 THEN
    RAISE NOTICE '✅ Migration 001 completed successfully - % tables created', table_count;
  ELSE
    RAISE EXCEPTION '❌ Migration 001 failed - only % tables created (expected 22)', table_count;
  END IF;
END $$;
