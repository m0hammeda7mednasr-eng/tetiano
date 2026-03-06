-- Migration 018: Store-per-tenant without super admin
-- Goal:
-- 1) Enforce store-only model (no global super admin flows)
-- 2) Normalize roles to: admin | manager | staff | viewer
-- 3) Canonical store admin owner column: stores.admin_user_id
-- 4) Remove legacy teams dependencies

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) stores.admin_user_id as canonical admin reference
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE stores
SET admin_user_id = owner_user_id
WHERE admin_user_id IS NULL
  AND owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_admin_user_id ON stores(admin_user_id);

-- 2) user_profiles cleanup: owner -> admin, force platform_role=user if column exists
UPDATE user_profiles
SET role = 'admin'
WHERE role = 'owner';

DO $$
DECLARE
  c RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'platform_role'
  ) THEN
    UPDATE user_profiles
    SET platform_role = 'user'
    WHERE platform_role IS DISTINCT FROM 'user';

    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.user_profiles'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%platform_role%'
    LOOP
      EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT %I', c.conname);
    END LOOP;

    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_platform_role_user_only
      CHECK (platform_role IN ('user'));
  END IF;
END $$;

-- 3) store_memberships cleanup: owner -> admin and enforce allowed roles
UPDATE store_memberships
SET store_role = 'admin'
WHERE store_role = 'owner';

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.store_memberships'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%store_role%'
  LOOP
    EXECUTE format('ALTER TABLE public.store_memberships DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.store_memberships
    ADD CONSTRAINT store_memberships_store_role_check
    CHECK (store_role IN ('admin', 'manager', 'staff', 'viewer'));
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_memberships_unique_user ON store_memberships(user_id);

-- 4) Legacy teams cleanup (no teams model in new architecture)
DROP TABLE IF EXISTS team_permissions CASCADE;
DROP TABLE IF EXISTS team_brands CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
