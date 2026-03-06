-- ═══════════════════════════════════════════════════════════════════════════════
-- إصلاح نهائي لقاعدة البيانات - بدون الاعتماد على brands
-- ═══════════════════════════════════════════════════════════════════════════════
-- هذا السكريبت يعمل مع النظام الجديد (stores بدلاً من brands)
-- شغّل هذا السكريبت على Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. جدول shopify_oauth_states (مطلوب لـ OAuth)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  shop TEXT NOT NULL,
  user_id UUID,
  api_key TEXT,
  api_secret TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_state ON shopify_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_shop ON shopify_oauth_states(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_expires ON shopify_oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_user ON shopify_oauth_states(user_id);

-- RLS
ALTER TABLE shopify_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oauth_states_all" ON shopify_oauth_states;
CREATE POLICY "oauth_states_all" ON shopify_oauth_states
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON shopify_oauth_states TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. جدول shopify_sync_runs (مطلوب لـ Sync)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shopify_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_store ON shopify_sync_runs(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_status ON shopify_sync_runs(status);

-- RLS
ALTER TABLE shopify_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_runs_all" ON shopify_sync_runs;
CREATE POLICY "sync_runs_all" ON shopify_sync_runs
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON shopify_sync_runs TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. جدول report_attachments (مطلوب للتقارير)
-- ═══════════════════════════════════════════════════════════════════════════════

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_attachments_store ON report_attachments(store_id);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON report_attachments(report_id);

-- RLS
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_all" ON report_attachments;
CREATE POLICY "attachments_all" ON report_attachments
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON report_attachments TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. جدول report_comments (مطلوب للتقارير)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  report_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_comments_store ON report_comments(store_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_report ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_user ON report_comments(user_id);

-- RLS
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_all" ON report_comments;
CREATE POLICY "comments_all" ON report_comments
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON report_comments TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. جدول reports (مطلوب للتقارير اليومية)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
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

-- Index فريد لمنع تكرار التقارير لنفس اليوم
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_store_date ON reports(store_id, report_date);

-- Indexes أخرى
CREATE INDEX IF NOT EXISTS idx_reports_store ON reports(store_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_all" ON reports;
CREATE POLICY "reports_all" ON reports
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON reports TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. جدول shopify_customers (مطلوب لـ Shopify)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
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

-- Index فريد لمنع تكرار العملاء
CREATE UNIQUE INDEX IF NOT EXISTS idx_shopify_customers_store_shopify_id 
  ON shopify_customers(store_id, shopify_customer_id);

-- Indexes أخرى
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store ON shopify_customers(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_shopify_id ON shopify_customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_email ON shopify_customers(email);

-- RLS
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_all" ON shopify_customers;
CREATE POLICY "customers_all" ON shopify_customers
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON shopify_customers TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. جدول brands (للتوافق مع الكود القديم - اختياري)
-- ═══════════════════════════════════════════════════════════════════════════════

-- إنشاء جدول brands فقط إذا لم يكن موجوداً (للتوافق مع الكود القديم)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_shopify_domain ON brands(shopify_domain);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_all" ON brands;
CREATE POLICY "brands_all" ON brands
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON brands TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. إضافة أعمدة اختيارية للتوافق
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة brand_id للجداول التي قد تحتاجه (للتوافق مع الكود القديم)
DO $$
BEGIN
  -- shopify_oauth_states
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_oauth_states' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE shopify_oauth_states ADD COLUMN brand_id UUID;
    CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_brand ON shopify_oauth_states(brand_id);
  END IF;

  -- shopify_sync_runs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_sync_runs' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE shopify_sync_runs ADD COLUMN brand_id UUID;
    CREATE INDEX IF NOT EXISTS idx_shopify_sync_runs_brand ON shopify_sync_runs(brand_id);
  END IF;

  -- reports
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE reports ADD COLUMN brand_id UUID;
    CREATE INDEX IF NOT EXISTS idx_reports_brand ON reports(brand_id);
  END IF;

  -- shopify_customers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_customers' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE shopify_customers ADD COLUMN brand_id UUID;
    CREATE INDEX IF NOT EXISTS idx_shopify_customers_brand ON shopify_customers(brand_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. التحقق النهائي
-- ═══════════════════════════════════════════════════════════════════════════════

-- عرض الجداول التي تم إنشاؤها
SELECT 
  'Table created: ' || table_name AS status
FROM information_schema.tables 
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
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- تم بنجاح! ✅
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT '✅ Database fix completed successfully!' AS final_status;
