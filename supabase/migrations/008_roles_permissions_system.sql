-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 008: Advanced Roles & Permissions System
-- ══════════════════════════════════════════════════════════════════════════════

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(100) NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create user_permissions for fine-grained access control
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES user_profiles(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, permission_id)
);

-- Insert core permissions
INSERT INTO permissions (name, description, category) VALUES
  -- Inventory
  ('can_view_inventory', 'عرض الجرد', 'inventory'),
  ('can_edit_inventory', 'تعديل الجرد', 'inventory'),
  ('can_adjust_stock', 'تعديل الكمية', 'inventory'),
  ('can_view_locations', 'عرض المواقع', 'inventory'),
  
  -- Orders
  ('can_view_orders', 'عرض الأوردرات', 'orders'),
  ('can_manage_orders', 'إدارة الأوردرات', 'orders'),
  ('can_update_order_status', 'تحديث حالة الأوردر', 'orders'),
  
  -- Reports
  ('can_submit_reports', 'إرسال التقارير', 'reports'),
  ('can_view_reports', 'عرض التقارير', 'reports'),
  ('can_export_reports', 'تصدير التقارير', 'reports'),
  
  -- Settings
  ('can_view_settings', 'عرض الإعدادات', 'settings'),
  ('can_manage_settings', 'إدارة الإعدادات', 'settings'),
  ('can_manage_brands', 'إدارة العلامات التجارية', 'settings'),
  ('can_manage_shopify', 'إدارة Shopify', 'settings'),
  
  -- Teams
  ('can_view_teams', 'عرض التيمات', 'teams'),
  ('can_manage_teams', 'إدارة التيمات', 'teams'),
  ('can_manage_team_members', 'إدارة أعضاء التيم', 'teams'),
  
  -- Admin
  ('can_manage_users', 'إدارة المستخدمين', 'admin'),
  ('can_view_admin_dashboard', 'عرض لوحة تحكم الأدمن', 'admin'),
  ('can_view_audit_logs', 'عرض سجلات التدقيق', 'admin'),
  ('can_manage_permissions', 'إدارة الصلاحيات', 'admin')
ON CONFLICT DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE category IN ('inventory', 'orders', 'reports', 'settings', 'teams', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE category IN ('inventory', 'orders', 'reports', 'teams')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions WHERE category IN ('inventory', 'reports')
ON CONFLICT DO NOTHING;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Update team_permissions to include new fields
ALTER TABLE team_permissions ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 10;
ALTER TABLE team_permissions ADD COLUMN IF NOT EXISTS max_brands INT DEFAULT 5;
ALTER TABLE team_permissions ADD COLUMN IF NOT EXISTS can_sync_shopify BOOLEAN DEFAULT FALSE;

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions (read-only for authenticated)
CREATE POLICY "permissions_read" ON permissions
FOR SELECT USING (TRUE);

-- RLS Policies for role_permissions (read-only for authenticated)
CREATE POLICY "role_permissions_read" ON role_permissions
FOR SELECT USING (TRUE);

-- RLS Policies for user_permissions (users can see their own)
CREATE POLICY "user_permissions_read" ON user_permissions
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for audit_logs (admins only)
CREATE POLICY "audit_logs_read" ON audit_logs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create function to check user has permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Direct permission
    SELECT 1 FROM user_permissions
    WHERE user_permissions.user_id = $1 
    AND permission_id = (SELECT id FROM permissions WHERE name = $2)
    AND (expires_at IS NULL OR expires_at > NOW())
    
    UNION
    
    -- Role-based permission
    SELECT 1 FROM user_profiles
    WHERE id = $1
    AND EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role = user_profiles.role
      AND permission_id = (SELECT id FROM permissions WHERE name = $2)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create function for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action VARCHAR,
  p_table_name VARCHAR,
  p_record_id UUID,
  p_changes JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, changes, ip_address, user_agent)
  VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_changes,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_audit_logs_timestamp
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_permissions_timestamp
BEFORE UPDATE ON permissions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Grant table access
GRANT SELECT ON permissions TO anon, authenticated;
GRANT SELECT ON role_permissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_permissions TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
