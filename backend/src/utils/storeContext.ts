import { AuthRequest } from "../middleware/auth";

export function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("null value") ||
    text.includes("violates not-null") ||
    text.includes("check constraint") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship")
  );
}

export function resolveStoreId(req: AuthRequest): string | null {
  // App scope must always use authenticated identity context.
  // Never trust store_id from query/path to prevent cross-tenant tampering.
  return req.user?.storeId || null;
}

export function assertStoreScope(req: AuthRequest, candidateStoreId: string): boolean {
  if (!candidateStoreId) return false;
  return req.user?.storeId === candidateStoreId;
}
