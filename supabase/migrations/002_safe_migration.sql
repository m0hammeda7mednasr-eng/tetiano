-- Safe Migration: Creates only missing tables and indexes
-- Uses IF NOT EXISTS to avoid conflicts

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    admin_user_id UUID,
    owner_user_id UUID,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Store Memberships table
CREATE TABLE IF NOT EXISTS store_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    store_role TEXT NOT NULL CHECK (store_role IN ('admin', 'manager', 'staff', 'viewer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, user_id)
);

-- 3. User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    avatar_color TEXT,
    role TEXT DEFAULT 'staff',
    platform_role TEXT DEFAULT 'user',
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopify_product_id TEXT,
    title TEXT NOT NULL,
    handle TEXT,
    vendor TEXT,
    product_type TEXT,
    status TEXT DEFAULT 'active',
    tags TEXT[],
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Variants table
CREATE TABLE IF NOT EXISTS variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    shopify_variant_id TEXT,
    title TEXT,
    sku TEXT,
    barcode TEXT,
    price DECIMAL(10,2),
    compare_at_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    position INTEGER,
    inventory_item_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventory Levels table
CREATE TABLE IF NOT EXISTS inventory_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    inventory_item_id TEXT,
    location_id TEXT,
    available INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Shopify Orders table
CREATE TABLE IF NOT EXISTS shopify_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopify_order_id TEXT UNIQUE,
    order_number INTEGER,
    order_name TEXT,
    email TEXT,
    phone TEXT,
    financial_status TEXT,
    fulfillment_status TEXT,
    total_price DECIMAL(10,2),
    subtotal_price DECIMAL(10,2),
    total_tax DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    customer_id UUID,
    created_at_shopify TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Order Line Items table
CREATE TABLE IF NOT EXISTS order_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    order_id UUID REFERENCES shopify_orders(id) ON DELETE CASCADE,
    shopify_line_item_id TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
    title TEXT,
    quantity INTEGER,
    price DECIMAL(10,2),
    total_discount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Shopify Customers table
CREATE TABLE IF NOT EXISTS shopify_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopify_customer_id TEXT UNIQUE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    total_spent DECIMAL(10,2),
    orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    report_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Shopify Connections table
CREATE TABLE IF NOT EXISTS shopify_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    access_token TEXT,
    scopes TEXT,
    status TEXT DEFAULT 'connected',
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Shopify OAuth States table
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state TEXT UNIQUE NOT NULL,
    shop TEXT NOT NULL,
    brand_id UUID,
    user_id UUID,
    api_key TEXT,
    api_secret TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Shopify Webhook Events table
CREATE TABLE IF NOT EXISTS shopify_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    webhook_id TEXT UNIQUE,
    topic TEXT NOT NULL,
    shop_domain TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 15. Brands table (legacy compatibility)
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    shopify_domain TEXT,
    shopify_access_token TEXT,
    access_token TEXT,
    shopify_location_id TEXT,
    shopify_api_key TEXT,
    api_key TEXT,
    api_secret TEXT,
    webhook_secret TEXT,
    shopify_scopes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_configured BOOLEAN DEFAULT false,
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes (with IF NOT EXISTS equivalent - drop and recreate)
DO $$ 
BEGIN
    -- Stores indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stores_slug') THEN
        CREATE INDEX idx_stores_slug ON stores(slug);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stores_status') THEN
        CREATE INDEX idx_stores_status ON stores(status);
    END IF;

    -- Store Memberships indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_store_memberships_store_id') THEN
        CREATE INDEX idx_store_memberships_store_id ON store_memberships(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_store_memberships_user_id') THEN
        CREATE INDEX idx_store_memberships_user_id ON store_memberships(user_id);
    END IF;

    -- Products indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_store_id') THEN
        CREATE INDEX idx_products_store_id ON products(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_shopify_id') THEN
        CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
    END IF;

    -- Variants indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_variants_store_id') THEN
        CREATE INDEX idx_variants_store_id ON variants(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_variants_product_id') THEN
        CREATE INDEX idx_variants_product_id ON variants(product_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_variants_sku') THEN
        CREATE INDEX idx_variants_sku ON variants(sku);
    END IF;

    -- Orders indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_store_id') THEN
        CREATE INDEX idx_orders_store_id ON shopify_orders(store_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_shopify_id') THEN
        CREATE INDEX idx_orders_shopify_id ON shopify_orders(shopify_order_id);
    END IF;

    -- Notifications indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user_id') THEN
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_is_read') THEN
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first to avoid conflicts)
DO $$ 
BEGIN
    -- Stores policies
    DROP POLICY IF EXISTS "Users can view their stores" ON stores;
    CREATE POLICY "Users can view their stores" ON stores
        FOR SELECT USING (
            id IN (
                SELECT store_id FROM store_memberships 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        );

    DROP POLICY IF EXISTS "Service role has full access to stores" ON stores;
    CREATE POLICY "Service role has full access to stores" ON stores
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    -- Store Memberships policies
    DROP POLICY IF EXISTS "Users can view their memberships" ON store_memberships;
    CREATE POLICY "Users can view their memberships" ON store_memberships
        FOR SELECT USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Service role has full access to memberships" ON store_memberships;
    CREATE POLICY "Service role has full access to memberships" ON store_memberships
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    -- User Profiles policies
    DROP POLICY IF EXISTS "Users can view their profile" ON user_profiles;
    CREATE POLICY "Users can view their profile" ON user_profiles
        FOR SELECT USING (id = auth.uid());

    DROP POLICY IF EXISTS "Service role has full access to profiles" ON user_profiles;
    CREATE POLICY "Service role has full access to profiles" ON user_profiles
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    -- Service role full access for all other tables
    DROP POLICY IF EXISTS "Service role full access" ON products;
    CREATE POLICY "Service role full access" ON products
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON variants;
    CREATE POLICY "Service role full access" ON variants
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON inventory_levels;
    CREATE POLICY "Service role full access" ON inventory_levels
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON shopify_orders;
    CREATE POLICY "Service role full access" ON shopify_orders
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON order_line_items;
    CREATE POLICY "Service role full access" ON order_line_items
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON shopify_customers;
    CREATE POLICY "Service role full access" ON shopify_customers
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON reports;
    CREATE POLICY "Service role full access" ON reports
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON notifications;
    CREATE POLICY "Service role full access" ON notifications
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON shopify_connections;
    CREATE POLICY "Service role full access" ON shopify_connections
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON shopify_oauth_states;
    CREATE POLICY "Service role full access" ON shopify_oauth_states
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON shopify_webhook_events;
    CREATE POLICY "Service role full access" ON shopify_webhook_events
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');

    DROP POLICY IF EXISTS "Service role full access" ON brands;
    CREATE POLICY "Service role full access" ON brands
        FOR ALL USING (auth.jwt()->>'role' = 'service_role');
END $$;
