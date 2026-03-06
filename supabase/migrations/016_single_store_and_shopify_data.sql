-- Migration 016: Single-store per user + professional Shopify data tables

-- 1) Enforce one primary store per user (application-level guard)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS primary_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_brand_id
  ON user_profiles(primary_brand_id);

-- 2) Persist full Shopify customers data
CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_customer_id VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  state VARCHAR(100),
  tags TEXT,
  accepts_marketing BOOLEAN,
  number_of_orders INTEGER,
  total_spent DECIMAL(14, 2),
  currency VARCHAR(10),
  created_at_shopify TIMESTAMPTZ,
  updated_at_shopify TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, shopify_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_customers_brand
  ON shopify_customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_shopify_id
  ON shopify_customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_email
  ON shopify_customers(email);

-- 3) Persist full Shopify orders data
CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  shopify_order_id VARCHAR(100) NOT NULL,
  customer_shopify_id VARCHAR(100),
  order_name VARCHAR(255),
  order_number BIGINT,
  email VARCHAR(255),
  financial_status VARCHAR(100),
  fulfillment_status VARCHAR(100),
  currency VARCHAR(10),
  subtotal_price DECIMAL(14, 2),
  total_tax DECIMAL(14, 2),
  total_discounts DECIMAL(14, 2),
  total_price DECIMAL(14, 2),
  current_total_price DECIMAL(14, 2),
  tags TEXT,
  note TEXT,
  line_items_count INTEGER,
  processed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at_shopify TIMESTAMPTZ,
  updated_at_shopify TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, shopify_order_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_brand
  ON shopify_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_id
  ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_id
  ON shopify_orders(customer_shopify_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_shopify
  ON shopify_orders(created_at_shopify DESC);

-- 4) Keep full Shopify payload/details for products and variants
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shopify_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE variants
  ADD COLUMN IF NOT EXISTS inventory_item_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS shopify_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_variants_inventory_item_id
  ON variants(inventory_item_id);

