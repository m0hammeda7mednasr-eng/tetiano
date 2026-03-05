-- Migration 011
-- 1) Ensure audit_logs table exists for full admin audit trail.
-- 2) Force all new signups to get admin role (as requested).

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action VARCHAR(255),
  ADD COLUMN IF NOT EXISTS table_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS changes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_read_admins" ON audit_logs;
CREATE POLICY "audit_logs_read_admins"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "audit_logs_insert_service" ON audit_logs;
CREATE POLICY "audit_logs_insert_service"
ON audit_logs FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  random_color TEXT;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  random_color := (
    ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  )[floor(random() * 6 + 1)];

  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, display_name, 'admin', TRUE, random_color)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    role = 'admin',
    is_active = TRUE,
    avatar_color = COALESCE(user_profiles.avatar_color, EXCLUDED.avatar_color);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Optional alignment with the requested policy: all existing users become admin.
UPDATE user_profiles
SET role = 'admin'
WHERE role IS DISTINCT FROM 'admin';
