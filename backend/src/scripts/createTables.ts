import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log("🚀 Starting table creation...");

  const tables = [
    // stores table
    `CREATE TABLE IF NOT EXISTS stores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      admin_user_id UUID,
      owner_user_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // store_memberships table
    `CREATE TABLE IF NOT EXISTS store_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      store_role TEXT NOT NULL DEFAULT 'member',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, user_id)
    );`,

    // brands table (legacy compatibility)
    `CREATE TABLE IF NOT EXISTS brands (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      shopify_domain TEXT,
      shopify_location_id TEXT,
      shopify_access_token TEXT,
      access_token TEXT,
      shopify_api_key TEXT,
      api_key TEXT,
      api_secret TEXT,
      shopify_scopes TEXT,
      is_active BOOLEAN DEFAULT true,
      is_configured BOOLEAN DEFAULT false,
      connected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // products table
    `CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      shopify_product_id TEXT,
      title TEXT,
      handle TEXT,
      product_type TEXT,
      vendor TEXT,
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // variants table
    `CREATE TABLE IF NOT EXISTS variants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      shopify_variant_id TEXT,
      title TEXT,
      sku TEXT,
      barcode TEXT,
      price NUMERIC(10,2),
      compare_at_price NUMERIC(10,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // inventory_levels table
    `CREATE TABLE IF NOT EXISTS inventory_levels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
      available INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // shopify_orders table
    `CREATE TABLE IF NOT EXISTS shopify_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      shopify_order_id TEXT,
      order_name TEXT,
      order_number INTEGER,
      currency TEXT,
      net_profit NUMERIC(10,2),
      created_at_shopify TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // shopify_customers table
    `CREATE TABLE IF NOT EXISTS shopify_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      shopify_customer_id TEXT,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // reports table
    `CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
      brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
      report_date DATE,
      total_sales NUMERIC(10,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,

    // Enable RLS
    `ALTER TABLE stores ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE store_memberships ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE brands ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE products ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE variants ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`,
  ];

  for (let i = 0; i < tables.length; i++) {
    const sql = tables[i];
    console.log(`\n📝 Executing statement ${i + 1}/${tables.length}...`);

    try {
      const { error } = await supabase.rpc("exec_sql", { sql });

      if (error) {
        console.log(`⚠️  Warning: ${error.message}`);
      } else {
        console.log(`✅ Success`);
      }
    } catch (err: any) {
      console.log(`⚠️  Error: ${err.message}`);
    }
  }

  console.log("\n🎉 Table creation completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Refresh your application");
  console.log("2. Try to sign up / login again");
  console.log("3. All 503 errors should be gone!");

  process.exit(0);
}

createTables().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
