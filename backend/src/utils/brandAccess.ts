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
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship")
  );
}

export async function getUserPrimaryBrandId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("primary_brand_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaCompatibilityError(error)) {
      logger.warn("primary_brand_id column is missing; single-store guard is disabled until migration runs", {
        error: error.message,
      });
      return null;
    }

    throw error;
  }

  return (data?.primary_brand_id as string | null) || null;
}

export async function ensureUserSingleBrand(userId: string, brandId: string): Promise<void> {
  const current = await getUserPrimaryBrandId(userId);
  if (!current) {
    const updateResult = await supabase
      .from("user_profiles")
      .update({ primary_brand_id: brandId })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (!updateResult.error && updateResult.data?.id) {
      return;
    }

    if (updateResult.error && !isSchemaCompatibilityError(updateResult.error)) {
      throw updateResult.error;
    }

    const { error } = await supabase
      .from("user_profiles")
      .upsert({ id: userId, primary_brand_id: brandId }, { onConflict: "id" });

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        logger.warn("Unable to persist primary_brand_id due to schema mismatch", {
          userId,
          brandId,
          error: error.message,
        });
        return;
      }
      throw error;
    }

    return;
  }

  if (current !== brandId) {
    throw new BrandAccessError(
      409,
      "single_store_limit",
      "Each user is limited to one Shopify store. Disconnect current store first.",
    );
  }
}

export async function assertUserBrandAccess(userId: string | undefined, brandId: string): Promise<void> {
  if (!userId) return;

  const current = await getUserPrimaryBrandId(userId);
  if (!current) {
    throw new BrandAccessError(
      403,
      "brand_access_not_initialized",
      "No store is linked to this account yet.",
    );
  }

  if (current !== brandId) {
    throw new BrandAccessError(
      403,
      "brand_access_denied",
      "You do not have access to this store.",
    );
  }
}

export async function clearUserPrimaryBrandIfMatches(
  userId: string | undefined,
  brandId: string,
): Promise<void> {
  if (!userId) return;
  const current = await getUserPrimaryBrandId(userId);
  if (!current || current !== brandId) return;

  const { error } = await supabase
    .from("user_profiles")
    .update({ primary_brand_id: null })
    .eq("id", userId);

  if (error && !isSchemaCompatibilityError(error)) {
    throw error;
  }
}
