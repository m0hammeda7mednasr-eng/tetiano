import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";

export type PlatformRole = "user";
export type StoreRole = "admin" | "manager" | "staff" | "viewer";
export type LegacyRole = "admin" | "manager" | "staff";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: LegacyRole;
    platformRole: PlatformRole;
    storeId: string | null;
    storeRole: StoreRole | null;
    membershipId: string | null;
    profile?: any;
    permissions?: Record<string, boolean> | null;
  };
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

function coercePermissionMap(value: unknown): Record<string, boolean> {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, boolean>>((acc, item) => {
      if (typeof item === "string" && item.trim()) {
        acc[item.trim()] = true;
      }
      return acc;
    }, {});
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, boolean>>(
      (acc, [key, raw]) => {
        if (typeof raw === "boolean") {
          acc[key] = raw;
        }
        return acc;
      },
      {},
    );
  }

  return {};
}

function buildStoreRoleFallbackPermissions(storeRole: StoreRole | null): Record<string, boolean> {
  if (storeRole === "admin") {
    return {
      "users.manage": true,
      "users.invite": true,
      "users.assign_role": true,
      "products.manage": true,
      "inventory.manage": true,
      "orders.manage": true,
      "reports.view": true,
      "reports.create": true,
      "shopify.manage": true,
      "notifications.view": true,
      "finance.view_cost": true,
      "finance.view_profit": true,
      can_view_inventory: true,
      can_edit_inventory: true,
      can_view_orders: true,
      can_submit_reports: true,
      can_view_reports: true,
      can_manage_users: true,
      can_manage_team: true,
      can_view_finance: true,
    };
  }

  if (storeRole === "manager") {
    return {
      "products.manage": true,
      "inventory.manage": true,
      "orders.manage": true,
      "reports.view": true,
      "reports.create": true,
      "notifications.view": true,
      can_view_inventory: true,
      can_edit_inventory: true,
      can_view_orders: true,
      can_submit_reports: true,
      can_view_reports: true,
    };
  }

  if (storeRole === "viewer") {
    return {
      "products.view": true,
      "inventory.view": true,
      "orders.view": true,
      "reports.view": true,
      "notifications.view": true,
      can_view_inventory: true,
      can_view_orders: true,
      can_view_reports: true,
    };
  }

  return {
    "products.view": true,
    "inventory.view": true,
    "orders.view": true,
    "reports.create": true,
    "notifications.view": true,
    can_view_inventory: true,
    can_submit_reports: true,
  };
}

function mergePermissionMaps(...maps: Array<Record<string, boolean> | null>): Record<string, boolean> | null {
  const merged = maps.reduce<Record<string, boolean>>((acc, map) => {
    if (!map) return acc;
    Object.assign(acc, map);
    return acc;
  }, {});

  return Object.keys(merged).length > 0 ? merged : null;
}

function normalizeStoreRole(inputRole: unknown): StoreRole | null {
  const role = typeof inputRole === "string" ? inputRole.toLowerCase() : "";
  if (role === "owner" || role === "admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "viewer") return "viewer";
  if (role === "staff" || role === "operator" || role === "user" || role === "member") return "staff";
  return null;
}

function toLegacyRole(storeRole: StoreRole | null): LegacyRole {
  if (storeRole === "admin") return "admin";
  if (storeRole === "manager") return "manager";
  return "staff";
}

function buildOverridePermissionMap(
  rows: Array<{ permission_key?: string | null; allowed?: boolean | null }> | null | undefined,
): Record<string, boolean> {
  if (!rows || rows.length === 0) return {};

  const permissions: Record<string, boolean> = {};
  for (const row of rows) {
    const key = String(row?.permission_key || "").trim();
    if (!key) continue;
    permissions[key] = row?.allowed === true;
  }
  return permissions;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logger.warn("Authentication failed", { error: userError?.message });
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const profileSelectVariants = [
      "id, full_name, role, is_active, avatar_color, permissions, store_id, primary_brand_id, platform_role",
      "id, full_name, role, is_active, avatar_color, permissions, store_id, primary_brand_id",
      "id, full_name, role, is_active, avatar_color, permissions",
      "id, full_name, role, is_active, avatar_color",
    ];

    let profile: any = null;
    let profileError: any = null;

    for (const selectQuery of profileSelectVariants) {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(selectQuery)
        .eq("id", user.id)
        .maybeSingle();

      if (!error) {
        profile = data;
        profileError = null;
        break;
      }

      profileError = error;
      if (!isSchemaCompatibilityError(error)) {
        break;
      }
    }

    if (profileError) {
      logger.error("Profile lookup failed", { error: profileError.message });
      return res.status(500).json({ error: "Failed to load user profile" });
    }

    if (profile?.is_active === false) {
      return res.status(403).json({ error: "This account is disabled" });
    }

    const profileStoreRole = normalizeStoreRole(profile?.role);
    const profilePermissions = coercePermissionMap(profile?.permissions);
    const hasProfilePermissions = Object.keys(profilePermissions).length > 0 ? profilePermissions : null;

    let storeId: string | null =
      (profile?.store_id as string | undefined) ||
      (profile?.primary_brand_id as string | undefined) ||
      null;
    let storeRole: StoreRole | null = profileStoreRole;
    let membershipId: string | null = null;

    const membershipResult = await supabase
      .from("store_memberships")
      .select("id, store_id, store_role, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membershipResult.error) {
      const membership = membershipResult.data;
      if (membership && membership.status !== "inactive") {
        membershipId = String(membership.id);
        storeId = String(membership.store_id);
        storeRole = normalizeStoreRole(membership.store_role);
      }
    } else if (!isSchemaCompatibilityError(membershipResult.error)) {
      logger.error("Store membership lookup failed", { error: membershipResult.error.message });
      return res.status(500).json({ error: "Failed to load user store membership" });
    }

    let overridePermissions: Record<string, boolean> | null = null;
    if (membershipId) {
      const { data, error } = await supabase
        .from("store_permissions_overrides")
        .select("permission_key, allowed")
        .eq("membership_id", membershipId);

      if (error && !isSchemaCompatibilityError(error)) {
        logger.error("Store permission overrides lookup failed", { error: error.message });
        return res.status(500).json({ error: "Failed to load user permission overrides" });
      }

      overridePermissions = buildOverridePermissionMap(
        (data || []) as Array<{ permission_key?: string | null; allowed?: boolean | null }>,
      );
      if (Object.keys(overridePermissions).length === 0) {
        overridePermissions = null;
      }
    }

    const legacyRole = toLegacyRole(storeRole);
    const roleFallbackPermissions = buildStoreRoleFallbackPermissions(storeRole);
    const permissions = mergePermissionMaps(
      hasProfilePermissions,
      overridePermissions,
      roleFallbackPermissions,
    );
    if (permissions?.can_adjust_inventory && permissions.can_edit_inventory === undefined) {
      permissions.can_edit_inventory = true;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: legacyRole,
      platformRole: "user",
      storeId,
      storeRole,
      membershipId,
      profile,
      permissions,
    };

    return next();
  } catch (err) {
    logger.error("Authentication error", { err });
    return res.status(500).json({ error: "Authentication failed" });
  }
};

export const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (req.user.role === "admin") {
      return next();
    }

    if (!roles.includes(req.user.role || "")) {
      return res.status(403).json({
        error: `Insufficient role. Required: ${roles.join(" or ")}`,
      });
    }

    return next();
  };
};

export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (req.user.role === "admin") return next();

    if (!req.user.permissions?.[permission]) {
      return res.status(403).json({ error: "Missing required permission" });
    }

    return next();
  };
};

export const requirePlatformRole = (...roles: PlatformRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!roles.includes(req.user.platformRole)) {
      return res.status(403).json({ error: "Forbidden platform role" });
    }

    return next();
  };
};

export const requireStoreContext = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!req.user.storeId) {
      return res.status(403).json({ error: "No store is linked to this account" });
    }

    return next();
  };
};

export const requireStoreRole = (...roles: StoreRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!req.user.storeRole || !roles.includes(req.user.storeRole)) {
      return res.status(403).json({ error: "Forbidden store role" });
    }

    return next();
  };
};

export const requireStorePermission = (permissionKey: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!req.user.storeId) {
      return res.status(403).json({ error: "No store is linked to this account" });
    }

    if (!req.user.permissions?.[permissionKey]) {
      return res.status(403).json({ error: "Missing required permission" });
    }

    return next();
  };
};
