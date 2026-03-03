-- Enable Row Level Security on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's team IDs
CREATE OR REPLACE FUNCTION get_user_team_ids(user_uuid UUID)
RETURNS TABLE(team_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's accessible brand IDs
CREATE OR REPLACE FUNCTION get_user_brand_ids(user_uuid UUID)
RETURNS TABLE(brand_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tb.brand_id
  FROM team_brands tb
  WHERE tb.team_id IN (SELECT get_user_team_ids(user_uuid));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid
    AND (
      role = required_role
      OR (required_role = 'manager' AND role = 'admin')
      OR (required_role = 'operator' AND role IN ('admin', 'manager'))
      OR (required_role = 'viewer' AND role IN ('admin', 'manager', 'operator'))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brands policies
CREATE POLICY "Users can view brands they have access to"
  ON brands FOR SELECT
  USING (id IN (SELECT get_user_brand_ids(auth.uid())));

CREATE POLICY "Admins can manage brands"
  ON brands FOR ALL
  USING (user_has_role(auth.uid(), 'admin'))
  WITH CHECK (user_has_role(auth.uid(), 'admin'));

-- Teams policies
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  USING (user_has_role(auth.uid(), 'admin'))
  WITH CHECK (user_has_role(auth.uid(), 'admin'));

-- Team members policies
CREATE POLICY "Users can view team members in their teams"
  ON team_members FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Admins and managers can manage team members"
  ON team_members FOR ALL
  USING (
    user_has_role(auth.uid(), 'manager')
    AND team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
  WITH CHECK (
    user_has_role(auth.uid(), 'manager')
    AND team_id IN (SELECT get_user_team_ids(auth.uid()))
  );

-- Team brands policies
CREATE POLICY "Users can view team brand access"
  ON team_brands FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Admins can manage team brand access"
  ON team_brands FOR ALL
  USING (user_has_role(auth.uid(), 'admin'))
  WITH CHECK (user_has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Users can view products from accessible brands"
  ON products FOR SELECT
  USING (brand_id IN (SELECT get_user_brand_ids(auth.uid())));

CREATE POLICY "Service role can manage products"
  ON products FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Variants policies
CREATE POLICY "Users can view variants from accessible brands"
  ON variants FOR SELECT
  USING (brand_id IN (SELECT get_user_brand_ids(auth.uid())));

CREATE POLICY "Service role can manage variants"
  ON variants FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Inventory levels policies
CREATE POLICY "Users can view inventory from accessible brands"
  ON inventory_levels FOR SELECT
  USING (brand_id IN (SELECT get_user_brand_ids(auth.uid())));

CREATE POLICY "Service role can manage inventory"
  ON inventory_levels FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Stock movements policies
CREATE POLICY "Users can view stock movements from accessible brands"
  ON stock_movements FOR SELECT
  USING (brand_id IN (SELECT get_user_brand_ids(auth.uid())));

CREATE POLICY "Operators can create stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (
    user_has_role(auth.uid(), 'operator')
    AND brand_id IN (SELECT get_user_brand_ids(auth.uid()))
  );

CREATE POLICY "Service role can manage stock movements"
  ON stock_movements FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Daily reports policies
CREATE POLICY "Users can view reports in their teams"
  ON daily_reports FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Users can create their own reports"
  ON daily_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reports"
  ON daily_reports FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Webhook events policies (service role only)
CREATE POLICY "Service role can manage webhook events"
  ON shopify_webhook_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- User profiles policies
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
