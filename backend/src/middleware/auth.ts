import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";

const TEAM_PERMISSIONS_ENABLED = process.env.TEAM_PERMISSIONS_ENABLED === "true";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: "admin" | "manager" | "staff";
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

function buildRoleFallbackPermissions(role: "admin" | "manager" | "staff"): Record<string, boolean> {
  if (role === "admin") {
    return {};
  }

  if (role === "manager") {
    return {
      can_view_inventory: true,
      can_edit_inventory: true,
      can_view_orders: true,
      can_submit_reports: true,
      can_view_reports: true,
    };
  }

  return {
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

    const normalizedRole = normalizeRole(profile?.role);
    const profilePermissions = coercePermissionMap(profile?.permissions);
    const hasProfilePermissions = Object.keys(profilePermissions).length > 0;

    let teamPermissions: Record<string, boolean> | null = null;
    if (TEAM_PERMISSIONS_ENABLED && normalizedRole !== "admin" && !hasProfilePermissions) {
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError && !isSchemaCompatibilityError(membershipError)) {
        logger.error("Team membership lookup failed", { error: membershipError.message });
        return res.status(500).json({ error: "Failed to load user team membership" });
      }

      if (membership?.team_id) {
        const { data: rawTeamPermissions, error: teamPermissionsError } = await supabase
          .from("team_permissions")
          .select("*")
          .eq("team_id", membership.team_id)
          .maybeSingle();

        if (teamPermissionsError && !isSchemaCompatibilityError(teamPermissionsError)) {
          logger.error("Team permissions lookup failed", { error: teamPermissionsError.message });
          return res.status(500).json({ error: "Failed to load team permissions" });
        }

        teamPermissions = coercePermissionMap(rawTeamPermissions);
      }
    }

    const roleFallbackPermissions = buildRoleFallbackPermissions(normalizedRole);
    const permissions = mergePermissionMaps(profilePermissions, teamPermissions, roleFallbackPermissions);
    if (permissions?.can_adjust_inventory && permissions.can_edit_inventory === undefined) {
      permissions.can_edit_inventory = true;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: normalizedRole,
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

    // Admin can pass any role guard.
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

function normalizeRole(inputRole: string | undefined): "admin" | "manager" | "staff" {
  if (!inputRole) return "staff";

  if (inputRole === "admin" || inputRole === "owner") {
    return "admin";
  }

  if (inputRole === "manager") {
    return "manager";
  }

  return "staff";
}
