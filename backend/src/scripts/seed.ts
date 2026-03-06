import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import crypto from "crypto";

type CreatedUser = {
  id: string;
  email: string;
};

function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "store";
}

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}

async function ensureAuthUser(email: string, password: string, fullName: string): Promise<CreatedUser> {
  const lookup = await supabase.auth.admin.listUsers();
  const existing = lookup.data?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (existing?.id) {
    return { id: existing.id, email: existing.email || email };
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (created.error || !created.data.user?.id) {
    throw created.error || new Error(`Failed to create user: ${email}`);
  }

  return { id: created.data.user.id, email: created.data.user.email || email };
}

async function createOrUpdateStore(storeId: string, storeName: string, adminUserId: string, slug: string) {
  let insert = await supabase
    .from("stores")
    .upsert(
      {
        id: storeId,
        name: storeName,
        slug,
        admin_user_id: adminUserId,
        status: "active",
      },
      { onConflict: "id" },
    )
    .select("id, name")
    .single();

  if (insert.error && isSchemaCompatibilityError(insert.error)) {
    insert = await supabase
      .from("stores")
      .upsert(
        {
          id: storeId,
          name: storeName,
          slug,
          owner_user_id: adminUserId,
          status: "active",
        },
        { onConflict: "id" },
      )
      .select("id, name")
      .single();
  }

  if (insert.error) {
    throw insert.error;
  }

  return insert.data;
}

async function seed() {
  try {
    logger.info("Starting Store-per-Tenant seed (no super admin)...");

    const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@tetiano.local").trim().toLowerCase();
    const adminPassword = (process.env.SEED_ADMIN_PASSWORD || "Admin12345!").trim();
    const adminName = (process.env.SEED_ADMIN_NAME || "Store Admin").trim();
    const storeName = (process.env.SEED_STORE_NAME || "Demo Store").trim();

    const adminUser = await ensureAuthUser(adminEmail, adminPassword, adminName);
    const storeId = process.env.SEED_STORE_ID?.trim() || crypto.randomUUID();
    const slug = `${slugify(storeName)}-${adminUser.id.replace(/-/g, "").slice(0, 6)}`;

    await createOrUpdateStore(storeId, storeName, adminUser.id, slug);

    const profile = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: adminUser.id,
          full_name: adminName,
          role: "admin",
          store_id: storeId,
          is_active: true,
          avatar_color: "#2563eb",
        },
        { onConflict: "id" },
      );
    if (profile.error) {
      throw profile.error;
    }

    const membership = await supabase
      .from("store_memberships")
      .upsert(
        {
          store_id: storeId,
          user_id: adminUser.id,
          store_role: "admin",
          status: "active",
        },
        { onConflict: "user_id" },
      );
    if (membership.error) {
      throw membership.error;
    }

    await supabase.from("brands").upsert(
      {
        id: storeId,
        name: `${storeName}-${storeId.replace(/-/g, "").slice(0, 6)}`,
        shopify_domain: `pending-${storeId.replace(/-/g, "").slice(0, 6)}.myshopify.com`,
        shopify_location_id: "pending",
      },
      { onConflict: "id" },
    );

    logger.info("Seed completed successfully");
    logger.info("Store Admin", { email: adminUser.email, storeId });
  } catch (error: any) {
    logger.error("Seed failed", { error: error?.message, code: error?.code });
    process.exit(1);
  }
}

seed();
