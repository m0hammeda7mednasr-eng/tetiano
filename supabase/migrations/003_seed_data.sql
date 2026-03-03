-- This migration can be run to seed initial data
-- Note: Update the shopify domains and location IDs with your actual values

-- Insert brands (update with your actual Shopify domains)
INSERT INTO brands (name, shopify_domain, shopify_location_id)
VALUES 
  ('Tetiano', 'tetiano.myshopify.com', '12345678'),
  ('98', '98brand.myshopify.com', '87654321')
ON CONFLICT (name) DO NOTHING;

-- Insert default team
INSERT INTO teams (name)
VALUES ('Default Team')
ON CONFLICT DO NOTHING;

-- Link team to brands
INSERT INTO team_brands (team_id, brand_id)
SELECT t.id, b.id
FROM teams t
CROSS JOIN brands b
WHERE t.name = 'Default Team'
ON CONFLICT (team_id, brand_id) DO NOTHING;

-- Note: Users must be created through Supabase Auth signup
-- After signup, manually assign users to teams:
-- INSERT INTO team_members (user_id, team_id, role)
-- VALUES ('user-uuid-from-auth-users', 'team-uuid', 'admin');
