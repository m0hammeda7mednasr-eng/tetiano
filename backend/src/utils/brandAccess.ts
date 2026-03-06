import { supabase } from "../config/supabase";
import { logger } from "./logger";

export class BrandAccessError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("null value") ||
    text.includes("violates not-null") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship")
  );
}

async function getUserStoreId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;

  const membership = await supabase
    .from("store_memberships")
    .select("store_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership.error && membership.data && membership.data.status !== "inactive") {
    return String(membership.data.store_id);
  }

  if (membership.error && !isSchemaCompatibilityError(membership.error)) {
    throw membership.error;
  }

  const profile = await supabase
    .from("user_profiles")
    .select("store_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile.error) {
    if (isSchemaCompatibilityError(profile.error)) {
      logger.warn("user_profiles.store_id is missing; store access guard is partially disabled", {
        userId,
        error: profile.error.message,
      });
      return null;
    }
    throw profile.error;
  }

  return (profile.data?.store_id as string | null) || null;
}

async function ensureProfileStoreLink(userId: string, storeId: string): Promise<void> {
  const update = await supabase
    .from("user_profiles")
    .update({ store_id: storeId })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (!update.error && update.data?.id) {
    return;
  }

  if (update.error && !isSchemaCompatibilityError(update.error)) {
    throw update.error;
  }

  const upsert = await supabase.from("user_profiles").upsert(
    {
      id: userId,
      store_id: storeId,
      role: "admin",
      is_active: true,
      full_name: "Store User",
      avatar_color: "#6366f1",
    },
    { onConflict: "id" },
  );

  if (upsert.error) {
    if (isSchemaCompatibilityError(upsert.error)) {
      logger.warn("Unable to persist user_profiles.store_id due to schema mismatch", {
        userId,
        storeId,
        error: upsert.error.message,
      });
      return;
    }
    throw upsert.error;
  }
}

export async function getUserPrimaryBrandId(userId?: string | null): Promise<string | null> {
  // Compatibility alias: legacy "brand" maps 1:1 to canonical store_id.
  return getUserStoreId(userId);
}

export async function ensureUserSingleBrand(userId: string, brandId: string): Promise<void> {
  const currentStoreId = await getUserStoreId(userId);

  if (!currentStoreId) {
    await ensureProfileStoreLink(userId, brandId);
    return;
  }

  if (currentStoreId !== brandId) {
    throw new BrandAccessError(
      409,
      "single_store_limit",
      "Each user account is limited to one store.",
    );
  }
}

export async function assertUserBrandAccess(userId: string | undefined, brandId: string): Promise<void> {
  if (!userId) return;

  const currentStoreId = await getUserStoreId(userId);
  if (!currentStoreId) {
    throw new BrandAccessError(
      403,
      "store_access_not_initialized",
      "No store is linked to this account yet.",
    );
  }

  if (currentStoreId !== brandId) {
    throw new BrandAccessError(
      403,
      "store_access_denied",
      "You do not have access to this store.",
    );
  }
}

export async function clearUserPrimaryBrandIfMatches(
  _userId: string | undefined,
  _brandId: string,
): Promise<void> {
  // Store link stays intact in store-per-tenant mode.
  return;
}

