import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: "admin" | "manager" | "staff";
    profile?: any;
    permissions?: Record<string, boolean> | null;
  };
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

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, role, is_active, avatar_color")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logger.error("Profile lookup failed", { error: profileError.message });
      return res.status(500).json({ error: "Failed to load user profile" });
    }

    if (profile?.is_active === false) {
      return res.status(403).json({ error: "This account is disabled" });
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    let permissions: Record<string, boolean> | null = null;
    if (membership?.team_id) {
      const { data: teamPermissions } = await supabase
        .from("team_permissions")
        .select("*")
        .eq("team_id", membership.team_id)
        .maybeSingle();
      permissions = (teamPermissions as Record<string, boolean>) || null;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: normalizeRole(profile?.role),
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
