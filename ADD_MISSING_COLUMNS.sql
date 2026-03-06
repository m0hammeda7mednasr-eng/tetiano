-- ═══════════════════════════════════════════════════════════════════════════════
-- إضافة الأعمدة المفقودة فقط
-- ═══════════════════════════════════════════════════════════════════════════════
-- هذا السكريبت يضيف الأعمدة المفقودة للجداول الموجودة
-- شغّل هذا السكريبت على Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. إصلاح جدول shopify_oauth_states
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة الأعمدة المفقودة
ALTER TABLE shopify_oauth_states 
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS brand_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- إضافة indexes
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_brand ON shopify_oauth_states(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_user ON shopify_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_expires ON shopify_oauth_states(expires_at);

-- تفعيل RLS
ALTER TABLE shopify_oauth_states ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات RLS
DROP POLICY IF EXISTS "oauth_states_all" ON shopify_oauth_states;
CREATE POLICY "oauth_states_all" ON shopify_oauth_states
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- منح الصلاحيات
GRANT ALL ON shopify_oauth_states TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. إنشاء الجداول المفقودة
-- ═══════════════════════════════════════════════════════════════════════════════

-- shopify_sync_runs
CREATE TABLE IF NOT EXISTS shopify_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  brand_id UUID,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  products_synced INTEGER DEFAULT 0,
  variants_synced INTEGER DEFAULT 0,
  orders_synced INTEGER DEFAULT 0,
  customers_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_store ON shopify_sync_runs(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_brand ON shopify_sync_runs(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_status ON shopify_sync_runs(status);

ALTER TABLE shopify_sync_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sync_runs_all" ON shopify_sync_runs;
CREATE POLICY "sync_runs_all" ON shopify_sync_runs FOR ALL USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON shopify_sync_runs TO authenticated, anon;

-- report_attachments
CREATE TABLE IF NOT EXISTS report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  report_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_attachments_store ON report_attachments(store_id);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON report_attachments(report_id);

ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attachments_all" ON report_attachments;
CREATE POLICY "attachments_all" ON report_attachments FOR ALL USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON report_attachments TO authenticated, anon;

-- report_comments
CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  report_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_comments_store ON report_comments(store_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_report ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_user ON report_comments(user_id);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_all" ON report_comments;
CREATE POLICY "comments_all" ON report_comments FOR ALL USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON report_comments TO authenticated, anon;

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  brand_id UUID,
  report_date DATE NOT NULL,
  body_text TEXT,
  done_today TEXT,
  blockers TEXT,
  plan_tomorrow TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_store_date ON reports(store_id, report_date);
CREATE INDEX IF NOT EXISTS idx_reports_store ON reports(store_id);
CREATE INDEX IF NOT EXISTS idx_reports_brand ON reports(brand_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_all" ON reports;
CREATE POLICY "reports_all" ON reports FOR ALL USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON reports TO authenticated, anon;

-- shopify_customers
CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  brand_id UUID,
  shopify_customer_id BIGINT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  total_spent DECIMAL(10,2),
  orders_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopify_customers_store_shopify_id 
  ON shopify_customers(store_id, shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store ON shopify_customers(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_brand ON shopify_customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_shopify_id ON shopify_customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_email ON shopify_customers(email);

ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_all" ON shopify_customers;
CREATE POLICY "customers_all" ON shopify_customers FOR ALL USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON shopify_customers TO authenticated, anon;

-- brands (للتوافق)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  api_key TEXT,
  api_secret TEXT,
  shopify_domain TEXT,
  shopify_scopes TEXT,
  connected_at TIMESTAMPTZ,
  is_configured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_shopify_domain ON brands(shopify_domain);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_all" ON brands;
CREATE POLICY "brands_all" ON brands FOR ALL USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON brands TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. التحقق النهائي
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'shopify_oauth_states',
    'shopify_sync_runs',
    'report_attachments',
    'report_comments',
    'reports',
    'shopify_customers',
    'brands'
  )
GROUP BY table_name
ORDER BY table_name;

SELECT '✅ All missing columns and tables added successfully!' AS status;
