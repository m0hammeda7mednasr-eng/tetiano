-- ═══════════════════════════════════════════════════════════
-- إضافة بيانات تجريبية للـ Admin Dashboard
-- ═══════════════════════════════════════════════════════════

-- 1. إضافة الأعمدة المطلوبة لجدول teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#6366f1';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. إضافة Teams (إذا لم تكن موجودة)
INSERT INTO teams (name, description, color, is_active)
VALUES 
  ('فريق المبيعات', 'فريق المبيعات والتسويق', '#6366f1', true),
  ('فريق المخزون', 'فريق إدارة المخزون', '#8b5cf6', true),
  ('فريق الدعم الفني', 'فريق خدمة العملاء', '#10b981', true)
ON CONFLICT DO NOTHING;

-- 3. ربط المستخدمين بالفرق
DO $$
DECLARE
  user_rec RECORD;
  team_rec RECORD;
  counter INT := 0;
BEGIN
  -- Get first team
  SELECT id INTO team_rec FROM teams LIMIT 1;
  
  -- Assign each user to a team
  FOR user_rec IN SELECT id FROM auth.users LOOP
    INSERT INTO team_members (user_id, team_id, role)
    VALUES (user_rec.id, team_rec.id, 'member')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    counter := counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Added % users to teams', counter;
END $$;

-- 4. إنشاء جدول team_permissions إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS team_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  can_view_inventory BOOLEAN DEFAULT TRUE,
  can_edit_inventory BOOLEAN DEFAULT FALSE,
  can_view_orders BOOLEAN DEFAULT TRUE,
  can_view_reports BOOLEAN DEFAULT TRUE,
  can_submit_reports BOOLEAN DEFAULT TRUE,
  can_view_settings BOOLEAN DEFAULT FALSE,
  can_manage_team BOOLEAN DEFAULT FALSE,
  brands_access UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. إضافة team permissions
INSERT INTO team_permissions (
  team_id,
  can_view_inventory,
  can_edit_inventory,
  can_view_orders,
  can_view_reports,
  can_submit_reports,
  can_view_settings,
  can_manage_team
)
SELECT 
  id,
  true,
  true,
  true,
  true,
  true,
  false,
  false
FROM teams
ON CONFLICT (team_id) DO NOTHING;

-- 6. إضافة تقارير يومية تجريبية
DO $$
DECLARE
  user_rec RECORD;
  team_rec RECORD;
BEGIN
  SELECT id INTO team_rec FROM teams LIMIT 1;
  
  FOR user_rec IN SELECT id FROM auth.users LIMIT 2 LOOP
    INSERT INTO daily_reports (
      user_id,
      team_id,
      report_date,
      done_today,
      blockers,
      plan_tomorrow,
      submitted_at
    )
    VALUES (
      user_rec.id,
      team_rec.id,
      CURRENT_DATE,
      'تم مراجعة المخزون وتحديث الكميات في النظام',
      'لا توجد معوقات',
      'متابعة الطلبات الجديدة والتنسيق مع فريق الشحن',
      NOW()
    )
    ON CONFLICT (user_id, report_date) DO NOTHING;
  END LOOP;
END $$;

-- 7. إضافة إشعارات تجريبية
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      read,
      created_at
    )
    VALUES 
      (user_rec.id, 'info', 'مرحباً بك!', 'تم تفعيل حسابك بنجاح في نظام إدارة المخزون', false, NOW()),
      (user_rec.id, 'reminder', 'تذكير', 'لا تنسى تقديم التقرير اليومي قبل نهاية اليوم', false, NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 8. التحقق من البيانات
SELECT 'Users' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Team Members', COUNT(*) FROM team_members
UNION ALL
SELECT 'Daily Reports', COUNT(*) FROM daily_reports
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'Brands', COUNT(*) FROM brands;

-- ═══════════════════════════════════════════════════════════
-- ✅ تم! الآن:
-- 1. سجل خروج من التطبيق
-- 2. سجل دخول مرة أخرى
-- 3. افتح Admin Dashboard - هتلاقي بيانات!
-- ═══════════════════════════════════════════════════════════
