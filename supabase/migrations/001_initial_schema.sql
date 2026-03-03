-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  shopify_domain VARCHAR(255) NOT NULL,
  shopify_location_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table (links auth.users to teams)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Team brand access
CREATE TABLE team_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, brand_id)
);

-- Products table (synced from Shopify)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_product_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  handle VARCHAR(255),
  product_type VARCHAR(255),
  vendor VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, shopify_product_id)
);

CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);

-- Variants table (synced from Shopify)
CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_variant_id VARCHAR(100) NOT NULL,
  title VARCHAR(500),
  sku VARCHAR(255),
  barcode VARCHAR(255),
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),
  position INTEGER,
  option1 VARCHAR(255),
  option2 VARCHAR(255),
  option3 VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, shopify_variant_id)
);

CREATE INDEX idx_variants_product ON variants(product_id);
CREATE INDEX idx_variants_brand ON variants(brand_id);
CREATE INDEX idx_variants_shopify_id ON variants(shopify_variant_id);
CREATE INDEX idx_variants_sku ON variants(sku);

-- Inventory levels table (current stock)
CREATE TABLE inventory_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  available INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_id)
);

CREATE INDEX idx_inventory_variant ON inventory_levels(variant_id);
CREATE INDEX idx_inventory_brand ON inventory_levels(brand_id);

-- Stock movements ledger (audit trail)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('webhook', 'manual', 'sync', 'order', 'refund', 'adjustment')),
  reason TEXT,
  reference_id VARCHAR(255),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_variant ON stock_movements(variant_id);
CREATE INDEX idx_movements_brand ON stock_movements(brand_id);
CREATE INDEX idx_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_movements_user ON stock_movements(user_id);

-- Daily reports table
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  done_today TEXT NOT NULL,
  blockers TEXT,
  plan_tomorrow TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_date)
);

CREATE INDEX idx_reports_user ON daily_reports(user_id);
CREATE INDEX idx_reports_team ON daily_reports(team_id);
CREATE INDEX idx_reports_date ON daily_reports(report_date DESC);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Shopify webhook events (idempotency)
CREATE TABLE shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_hash VARCHAR(64) NOT NULL UNIQUE,
  topic VARCHAR(100) NOT NULL,
  shopify_id VARCHAR(100),
  brand_id UUID REFERENCES brands(id),
  processed BOOLEAN DEFAULT FALSE,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_hash ON shopify_webhook_events(event_hash);
CREATE INDEX idx_webhook_processed ON shopify_webhook_events(processed);
CREATE INDEX idx_webhook_created ON shopify_webhook_events(created_at DESC);

-- User profiles (extended auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  timezone VARCHAR(100) DEFAULT 'Africa/Cairo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
