-- ═══════════════════════════════════════════════════════════════════════════════
-- إصلاح جدول Shopify OAuth States
-- ═══════════════════════════════════════════════════════════════════════════════
-- هذا السكريبت ينشئ جدول shopify_oauth_states المطلوب لعملية OAuth
-- شغّل هذا السكريبت على Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. إنشاء جدول shopify_oauth_states
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  shop TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key TEXT,
  api_secret TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. إنشاء الـ indexes
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_state ON shopify_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_shop ON shopify_oauth_states(shop);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_brand ON shopify_oauth_states(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_expires ON shopify_oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_user ON shopify_oauth_states(user_id);

-- 3. تفعيل RLS
ALTER TABLE shopify_oauth_states ENABLE ROW LEVEL SECURITY;

-- 4. إنشاء سياسات RLS (السماح للجميع - Backend يستخدم service_role)
DROP POLICY IF EXISTS "oauth_states_read" ON shopify_oauth_states;
CREATE POLICY "oauth_states_read" ON shopify_oauth_states
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "oauth_states_insert" ON shopify_oauth_states;
CREATE POLICY "oauth_states_insert" ON shopify_oauth_states
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "oauth_states_update" ON shopify_oauth_states;
CREATE POLICY "oauth_states_update" ON shopify_oauth_states
  FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "oauth_states_delete" ON shopify_oauth_states;
CREATE POLICY "oauth_states_delete" ON shopify_oauth_states
  FOR DELETE USING (TRUE);

-- 5. منح الصلاحيات
GRANT SELECT, INSERT, UPDATE, DELETE ON shopify_oauth_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shopify_oauth_states TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- تم بنجاح! ✅
-- ═══════════════════════════════════════════════════════════════════════════════
