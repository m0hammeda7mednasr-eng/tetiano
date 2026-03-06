import { Router, Response } from "express";
import { randomUUID } from "crypto";
import { authenticate, AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import { isSchemaCompatibilityError } from "../utils/storeContext";
import { logAuditEvent } from "../utils/auditLogger";

const router = Router();

router.use(authenticate);

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "store";
}

function defaultStoreName(req: AuthRequest): string {
  const fullName = String(req.user?.profile?.full_name || "").trim();
  if (fullName) return `${fullName} Store`;

  const email = String(req.user?.email || "").trim();
  if (email.includes("@")) {
    return `${email.split("@")[0]} Store`;
  }

  return "My Store";
}

async function ensureLegacyBrandRow(storeId: string, storeName: string): Promise<void> {
  const existing = await supabase.from("brands").select("id").eq("id", storeId).maybeSingle();
  if (existing.error) {
    if (isSchemaCompatibilityError(existing.error)) {
      return;
    }
    throw existing.error;
  }

  if (existing.data) {
    const update = await supabase
      .from("brands")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", storeId);
    if (update.error && !isSchemaCompatibilityError(update.error)) {
      throw update.error;
    }
    return;
  }

  const nameSuffix = storeId.replace(/-/g, "").slice(0, 6);
  const brandName = `${storeName}`.slice(0, 80) + `-${nameSuffix}`;
  const placeholderDomain = `pending-${nameSuffix}.myshopify.com`;

  let insert = await supabase.from("brands").insert({
    id: storeId,
    name: brandName,
    shopify_domain: placeholderDomain,
    shopify_location_id: "pending",
    is_active: true,
    is_configured: false,
    updated_at: new Date().toISOString(),
  });

  if (insert.error && isSchemaCompatibilityError(insert.error)) {
    insert = await supabase.from("brands").insert({
      id: storeId,
      name: brandName,
      shopify_domain: placeholderDomain,
      shopify_location_id: "pending",
    });
  }

  if (insert.error && !isSchemaCompatibilityError(insert.error)) {
    throw insert.error;
  }
}

router.post("/bootstrap-store", async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const existingMembership = await supabase
      .from("store_memberships")
      .select("id, store_id, store_role, status")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (existingMembership.error) {
      if (isSchemaCompatibilityError(existingMembership.error)) {
        return res.status(503).json({
          error: "store_memberships table is unavailable. Run migration 017_store_per_tenant_v2.sql",
        });
      }
      throw existingMembership.error;
    }

    if (existingMembership.data) {
      return res.json({
        success: true,
        store_id: existingMembership.data.store_id,
        membership: existingMembership.data,
        already_exists: true,
      });
    }

    const profile = await supabase
      .from("user_profiles")
      .select("id, full_name, avatar_color, is_active")
      .eq("id", req.user.id)
      .maybeSingle();

    if (profile.error && !isSchemaCompatibilityError(profile.error)) {
      throw profile.error;
    }

    const requestedName = String(req.body?.store_name || "").trim();
    const storeName = (requestedName || defaultStoreName(req)).slice(0, 80);
    const storeId = randomUUID();
    const slug = `${slugify(storeName)}-${req.user.id.replace(/-/g, "").slice(0, 6)}`;

    let storeInsert = await supabase
      .from("stores")
      .insert({
        id: storeId,
        name: storeName,
        slug,
        admin_user_id: req.user.id,
        status: "active",
      })
      .select("id, name, slug, admin_user_id, status, created_at")
      .single();

    if (storeInsert.error && isSchemaCompatibilityError(storeInsert.error)) {
      storeInsert = await supabase
        .from("stores")
        .insert({
          id: storeId,
          name: storeName,
          slug,
          owner_user_id: req.user.id,
          status: "active",
        })
        .select("id, name, slug, owner_user_id, status, created_at")
        .single();
    }

    if (storeInsert.error) {
      if (isSchemaCompatibilityError(storeInsert.error)) {
        return res.status(503).json({
          error: "stores table is unavailable. Run migration 017_store_per_tenant_v2.sql and 018_store_admin_no_super_admin.sql",
        });
      }
      throw storeInsert.error;
    }

    const profileUpsert = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: req.user.id,
          full_name: profile.data?.full_name || req.user.email?.split("@")[0] || "Store Admin",
          role: "admin",
          store_id: storeId,
          is_active: profile.data?.is_active !== false,
          avatar_color: profile.data?.avatar_color || "#6366f1",
        },
        { onConflict: "id" },
      );

    if (profileUpsert.error && !isSchemaCompatibilityError(profileUpsert.error)) {
      throw profileUpsert.error;
    }

    const membershipInsert = await supabase
      .from("store_memberships")
      .insert({
        store_id: storeId,
        user_id: req.user.id,
        store_role: "admin",
        status: "active",
      })
      .select("id, store_id, user_id, store_role, status")
      .single();

    if (membershipInsert.error) {
      if (membershipInsert.error.code === "23505") {
        const fallbackMembership = await supabase
          .from("store_memberships")
          .select("id, store_id, user_id, store_role, status")
          .eq("user_id", req.user.id)
          .maybeSingle();

        if (fallbackMembership.error) {
          throw fallbackMembership.error;
        }

        return res.status(200).json({
          success: true,
          store: storeInsert.data,
          membership: fallbackMembership.data,
          already_exists: true,
        });
      }
      throw membershipInsert.error;
    }

    await ensureLegacyBrandRow(storeId, storeName);

    await logAuditEvent({
      userId: req.user.id,
      storeId,
      action: "onboarding.store.bootstrap",
      tableName: "stores",
      recordId: storeId,
      after: {
        store: storeInsert.data,
        membership: membershipInsert.data,
      },
    });

    return res.status(201).json({
      success: true,
      store: storeInsert.data,
      membership: membershipInsert.data,
    });
  } catch (error: any) {
    logger.error("Onboarding bootstrap-store failed", {
      error: error?.message,
      code: error?.code,
      details: error?.details,
    });

    return res.status(500).json({
      error: error?.message || "Failed to bootstrap store",
    });
  }
});

export default router;
