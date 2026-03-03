-- ═══════════════════════════════════════════════════════════
-- Migration 008: Simplified RBAC System
-- Replace complex teams system with simple user roles + invites
-- ═══════════════════════════════════════════════════════════

-- 1. Add role and permissions to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
    CHECK (role IN ('owner', 'admin', 'manager', 'user', 'viewer')),
  ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#6366f1';

-- 2. Create invites table
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
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON invites(created_by_id);

-- 3. Update user_profiles RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

CREATE POLICY "Anyone can view active profiles"
  ON user_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Service role can manage profiles"
  ON user_profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 4. Enable RLS on invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invites"
  ON invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update invites"
  ON invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- 5. Simplified brand access (all active users can access all brands)
DROP POLICY IF EXISTS "Users can view brands they have access to" ON brands;
DROP POLICY IF EXISTS "Admins can manage brands" ON brands;

CREATE POLICY "Active users can view brands"
  ON brands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage brands"
  ON brands FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- 6. Simplified products/variants/inventory access
DROP POLICY IF EXISTS "Users can view products from accessible brands" ON products;
DROP POLICY IF EXISTS "Service role can manage products" ON products;

CREATE POLICY "Active users can view products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage products"
  ON products FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Same for variants
DROP POLICY IF EXISTS "Users can view variants from accessible brands" ON variants;
DROP POLICY IF EXISTS "Service role can manage variants" ON variants;

CREATE POLICY "Active users can view variants"
  ON variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage variants"
  ON variants FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Same for inventory
DROP POLICY IF EXISTS "Users can view inventory from accessible brands" ON inventory_levels;
DROP POLICY IF EXISTS "Service role can manage inventory" ON inventory_levels;

CREATE POLICY "Active users can view inventory"
  ON inventory_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage inventory"
  ON inventory_levels FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Same for stock movements
DROP POLICY IF EXISTS "Users can view stock movements from accessible brands" ON stock_movements;
DROP POLICY IF EXISTS "Operators can create stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Service role can manage stock movements" ON stock_movements;

CREATE POLICY "Active users can view stock movements"
  ON stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Managers can create stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage stock movements"
  ON stock_movements FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 7. Update daily reports (remove team_id requirement)
ALTER TABLE daily_reports DROP COLUMN IF EXISTS team_id;

DROP POLICY IF EXISTS "Users can view reports in their teams" ON daily_reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON daily_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON daily_reports;

CREATE POLICY "Admins can view all reports"
  ON daily_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can view their own reports"
  ON daily_reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own reports"
  ON daily_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reports"
  ON daily_reports FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. Update handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
  user_full_name TEXT;
  random_color TEXT;
BEGIN
  -- Get full name from metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  
  -- Generate random avatar color
  random_color := (ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'])[floor(random() * 6 + 1)];
  
  -- Insert profile with default role 'user'
  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, user_full_name, 'user', true, random_color)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Helper function to check user permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_key TEXT)
RETURNS BOOLEAN AS $
DECLARE
  user_role TEXT;
  user_perms TEXT[];
BEGIN
  SELECT role, permissions INTO user_role, user_perms
  FROM user_profiles
  WHERE id = user_uuid AND is_active = true;
  
  -- Owners and admins have all permissions
  IF user_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if permission is in array
  RETURN permission_key = ANY(user_perms);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Set first user as owner (if no owner exists)
DO $
DECLARE
  first_user_id UUID;
BEGIN
  SELECT id INTO first_user_id
  FROM user_profiles
  WHERE role != 'owner'
  ORDER BY created_at
  LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE user_profiles
    SET role = 'owner'
    WHERE id = first_user_id;
  END IF;
END $;

COMMENT ON TABLE invites IS 'User invitation system for onboarding new team members';
COMMENT ON COLUMN user_profiles.role IS 'User role: owner (full access), admin (manage users), manager (manage inventory), user (view/edit), viewer (read-only)';
COMMENT ON COLUMN user_profiles.permissions IS 'Array of specific permission keys for granular access control';
