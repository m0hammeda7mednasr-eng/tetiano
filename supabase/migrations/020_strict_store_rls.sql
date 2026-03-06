-- Migration 020: Strict store-scoped RLS hardening (store-per-tenant)
-- Goals:
-- 1) Remove permissive policies (e.g. USING (TRUE)) from sensitive tables
-- 2) Enforce store_id tenant isolation for authenticated users
-- 3) Keep backend service-role access functional (service role bypasses RLS)

CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT sm.store_id
      FROM public.store_memberships sm
      WHERE sm.user_id = auth.uid()
        AND sm.status = 'active'
      ORDER BY sm.created_at ASC
      LIMIT 1
    ),
    (
      SELECT up.store_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_memberships sm
    WHERE sm.user_id = auth.uid()
      AND sm.store_id = target_store_id
      AND sm.status = 'active'
      AND sm.store_role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_table_policies(target_table text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  policy_row RECORD;
BEGIN
  IF to_regclass('public.' || target_table) IS NULL THEN
    RETURN;
  END IF;

  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = target_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, target_table);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_store_scoped_policies(target_table text, allow_member_write boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  write_condition text;
BEGIN
  IF to_regclass('public.' || target_table) IS NULL THEN
    RETURN;
  END IF;

  IF allow_member_write THEN
    write_condition := 'store_id = public.current_store_id()';
  ELSE
    write_condition := 'store_id = public.current_store_id() AND public.is_store_admin(store_id)';
  END IF;

  PERFORM public.reset_table_policies(target_table);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (store_id = public.current_store_id())',
    target_table || '_select_store',
    target_table
  );

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
    target_table || '_insert_store',
    target_table,
    write_condition
  );

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
    target_table || '_update_store',
    target_table,
    write_condition,
    write_condition
  );

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
    target_table || '_delete_store',
    target_table,
    write_condition
  );
END;
$$;

-- Store-scoped application tables
SELECT public.apply_store_scoped_policies('products');
SELECT public.apply_store_scoped_policies('variants');
SELECT public.apply_store_scoped_policies('inventory_levels');
SELECT public.apply_store_scoped_policies('stock_movements');
SELECT public.apply_store_scoped_policies('shopify_orders');
SELECT public.apply_store_scoped_policies('shopify_customers');
SELECT public.apply_store_scoped_policies('shopify_webhook_events');
SELECT public.apply_store_scoped_policies('shopify_connections');
SELECT public.apply_store_scoped_policies('shopify_sync_jobs');
SELECT public.apply_store_scoped_policies('shopify_sync_runs');
SELECT public.apply_store_scoped_policies('reports');
SELECT public.apply_store_scoped_policies('report_attachments');
SELECT public.apply_store_scoped_policies('report_comments');
SELECT public.apply_store_scoped_policies('order_financials');

-- Notifications: user-scoped inside store
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.reset_table_policies('notifications');
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  CREATE POLICY notifications_select_own_store
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (
      store_id = public.current_store_id()
      AND user_id = auth.uid()
    );

  CREATE POLICY notifications_update_own_store
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (
      store_id = public.current_store_id()
      AND user_id = auth.uid()
    )
    WITH CHECK (
      store_id = public.current_store_id()
      AND user_id = auth.uid()
    );
END $$;

-- Stores table
DO $$
BEGIN
  IF to_regclass('public.stores') IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.reset_table_policies('stores');
  ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

  CREATE POLICY stores_select_current_store
    ON public.stores
    FOR SELECT
    TO authenticated
    USING (id = public.current_store_id());

  CREATE POLICY stores_update_admin
    ON public.stores
    FOR UPDATE
    TO authenticated
    USING (id = public.current_store_id() AND public.is_store_admin(id))
    WITH CHECK (id = public.current_store_id() AND public.is_store_admin(id));
END $$;

-- Store memberships table
DO $$
BEGIN
  IF to_regclass('public.store_memberships') IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.reset_table_policies('store_memberships');
  ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;

  CREATE POLICY store_memberships_select_current_store
    ON public.store_memberships
    FOR SELECT
    TO authenticated
    USING (store_id = public.current_store_id());

  CREATE POLICY store_memberships_insert_admin
    ON public.store_memberships
    FOR INSERT
    TO authenticated
    WITH CHECK (
      store_id = public.current_store_id()
      AND public.is_store_admin(store_id)
    );

  CREATE POLICY store_memberships_update_admin
    ON public.store_memberships
    FOR UPDATE
    TO authenticated
    USING (
      store_id = public.current_store_id()
      AND public.is_store_admin(store_id)
    )
    WITH CHECK (
      store_id = public.current_store_id()
      AND public.is_store_admin(store_id)
    );

  CREATE POLICY store_memberships_delete_admin
    ON public.store_memberships
    FOR DELETE
    TO authenticated
    USING (
      store_id = public.current_store_id()
      AND public.is_store_admin(store_id)
    );
END $$;

-- Permissions overrides table
DO $$
BEGIN
  IF to_regclass('public.store_permissions_overrides') IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.reset_table_policies('store_permissions_overrides');
  ALTER TABLE public.store_permissions_overrides ENABLE ROW LEVEL SECURITY;

  CREATE POLICY store_permissions_overrides_select_current_store
    ON public.store_permissions_overrides
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.store_memberships sm
        WHERE sm.id = membership_id
          AND sm.store_id = public.current_store_id()
      )
    );

  CREATE POLICY store_permissions_overrides_write_admin
    ON public.store_permissions_overrides
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.store_memberships sm
        WHERE sm.id = membership_id
          AND sm.store_id = public.current_store_id()
          AND public.is_store_admin(sm.store_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.store_memberships sm
        WHERE sm.id = membership_id
          AND sm.store_id = public.current_store_id()
          AND public.is_store_admin(sm.store_id)
      )
    );
END $$;

-- User profiles table
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.reset_table_policies('user_profiles');
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

  CREATE POLICY user_profiles_select_self_or_admin
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
      id = auth.uid()
      OR (store_id = public.current_store_id() AND public.is_store_admin(store_id))
    );

  CREATE POLICY user_profiles_insert_self
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      id = auth.uid()
      AND (store_id IS NULL OR store_id = public.current_store_id())
    );

  CREATE POLICY user_profiles_update_self_or_admin
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (
      id = auth.uid()
      OR (store_id = public.current_store_id() AND public.is_store_admin(store_id))
    )
    WITH CHECK (
      id = auth.uid()
      OR (store_id = public.current_store_id() AND public.is_store_admin(store_id))
    );
END $$;

-- Cleanup helper function no longer needed after migration run
DROP FUNCTION IF EXISTS public.apply_store_scoped_policies(text, boolean);

