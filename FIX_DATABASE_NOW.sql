-- ═══════════════════════════════════════════════════════════
-- إصلاح قاعدة البيانات - شغل هذا الكود في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. إضافة الأعمدة المطلوبة لجدول user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
    CHECK (role IN ('owner', 'admin', 'manager', 'user', 'viewer')),
  ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#6366f1';

-- 2. تحديث المستخدمين الموجودين
UPDATE user_profiles
SET 
  role = COALESCE(role, 'user'),
  is_active = COALESCE(is_active, true),
  avatar_color = COALESCE(avatar_color, '#6366f1'),
  permissions = COALESCE(permissions, '{}');

-- 3. جعل أول مستخدم admin
UPDATE user_profiles
SET role = 'admin', is_active = true
WHERE id = (
  SELECT id FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
);

-- 4. إنشاء جدول الدعوات
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'user', 'viewer')),
  permissions TEXT[] DEFAULT '{}',
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);

-- 5. تفعيل RLS على جدول invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all invites" ON invites;
CREATE POLICY "Admins can view all invites"
  ON invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can create invites" ON invites;
CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- 6. إضافة أعمدة OAuth للعلامات التجارية (إذا لم تكن موجودة)
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS shopify_scopes TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS api_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- 7. إنشاء جدول OAuth states
CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  state TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT,
  api_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_created ON shopify_oauth_states (created_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON shopify_oauth_states (user_id);

-- 8. تحديث سياسات RLS للجداول الرئيسية
DROP POLICY IF EXISTS "Active users can view brands" ON brands;
CREATE POLICY "Active users can view brands"
  ON brands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Active users can view products" ON products;
CREATE POLICY "Active users can view products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Active users can view variants" ON variants;
CREATE POLICY "Active users can view variants"
  ON variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Active users can view inventory" ON inventory_levels;
CREATE POLICY "Active users can view inventory"
  ON inventory_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

-- 9. تحديث trigger لإنشاء profile تلقائياً
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
  user_full_name TEXT;
  random_color TEXT;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  random_color := (ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'])[floor(random() * 6 + 1)];
  
  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, user_full_name, 'user', true, random_color)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. التحقق من النتائج
SELECT 
  u.email,
  p.full_name,
  p.role,
  p.is_active,
  p.avatar_color
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
ORDER BY u.created_at;

-- ═══════════════════════════════════════════════════════════
-- ✅ تم! الآن:
-- 1. سجل خروج من التطبيق
-- 2. سجل دخول مرة أخرى
-- 3. افتح: http://localhost:5173/admin/dashboard
-- ═══════════════════════════════════════════════════════════
