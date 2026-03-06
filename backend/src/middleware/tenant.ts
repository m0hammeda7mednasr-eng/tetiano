import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { assertUserBrandAccess, BrandAccessError, getUserPrimaryBrandId } from "../utils/brandAccess";

export interface TenantAuthRequest extends AuthRequest {
  tenantId?: string;
}

function extractTenantId(req: TenantAuthRequest): string {
  const byParams = String(
    req.params?.tenantId ||
    req.params?.brandId ||
    "",
  ).trim();

  if (byParams) return byParams;

  const byQuery = String(req.query?.tenant_id || req.query?.brand_id || "").trim();
  if (byQuery) return byQuery;

  const byHeader = String(req.headers["x-tenant-id"] || "").trim();
  return byHeader;
}

export const requireTenantContext = async (
  req: TenantAuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let tenantId = extractTenantId(req);

    if (!tenantId) {
      tenantId = (await getUserPrimaryBrandId(req.user?.id)) || "";
    }

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required" });
    }

    await assertUserBrandAccess(req.user?.id, tenantId);
    req.tenantId = tenantId;
    return next();
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    return res.status(500).json({ error: "Failed to resolve tenant context" });
  }
};

export const requireTenantPermission = (permission: string) => {
  return async (req: TenantAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (req.user.role !== "admin" && !req.user.permissions?.[permission]) {
      return res.status(403).json({ error: "Missing required permission" });
    }

    return requireTenantContext(req, res, next);
  };
};

