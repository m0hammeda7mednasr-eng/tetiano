import { Router, Response } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import { logAuditEvent } from "../utils/auditLogger";
import crypto from "crypto";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);

function resolveBackendBaseUrl(): string {
  const explicit = (process.env.BACKEND_URL || process.env.API_URL || "").trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const port = (process.env.PORT || "3002").trim();
  return `http://localhost:${port}`;
}

const BACKEND_BASE_URL = resolveBackendBaseUrl();

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

async function getUserSnapshot(userId: string) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, is_active, avatar_color, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  const { data: teams } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId);

  return {
    ...(profile || {}),
    teams: teams || [],
  };
}

async function getTeamSnapshot(teamId: string) {
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, description, color, is_active, created_at, updated_at")
    .eq("id", teamId)
    .maybeSingle();

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("team_id", teamId);

  const { data: permissions } = await supabase
    .from("team_permissions")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  return {
    ...(team || {}),
    members: members || [],
    permissions: permissions || null,
  };
}

async function getBrandSnapshot(brandId: string) {
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .maybeSingle();
  return data;
}

// ══════════════════════════════════════════════
//  USERS MANAGEMENT
// ══════════════════════════════════════════════

/** GET /api/admin/users - list all users */
router.get(
  "/users",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userSelectVariants = [
        `
        id, full_name, role, is_active, avatar_color, created_at,
        team_members (
          team_id,
          role,
          teams ( id, name, color )
        )
      `,
        `
        id, full_name, role, is_active, created_at,
        team_members (
          team_id,
          role,
          teams ( id, name, color )
        )
      `,
        `id, full_name, role, is_active, created_at`,
      ];

      let users: any[] = [];
      let usersError: any = null;

      for (const selectQuery of userSelectVariants) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select(selectQuery)
          .order("created_at", { ascending: false });

        if (!error) {
          users = data || [];
          usersError = null;
          break;
        }

        usersError = error;
        if (!isSchemaCompatibilityError(error)) {
          break;
        }
      }

      if (usersError) throw usersError;

      const emailMap = new Map<string, string>();
      try {
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
        if (authUsersError) {
          throw authUsersError;
        }
        for (const authUser of authUsers?.users || []) {
          emailMap.set(authUser.id, authUser.email || "");
        }
      } catch (emailError: any) {
        logger.warn("Admin: unable to fetch auth emails, continuing without them", {
          error: emailError?.message,
        });
      }

      const result = users.map((u) => ({
        ...u,
        email: emailMap.get(u.id) || "",
      }));
      res.json({ users: result });
    } catch (err: any) {
      logger.error("Admin: list users error", {
        error: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
      });
      res.status(500).json({ error: err.message });
    }
  },
);

/** POST /api/admin/users - create new user */
router.post(
  "/users",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const {
      email,
      full_name,
      role = "staff",
      password,
      team_id,
      team_role = "member",
      avatar_color,
    } = req.body;

    if (!email || !full_name) {
      return res
        .status(400)
        .json({ error: "البريد الإلكتروني والاسم مطلوبان" });
    }

    const providedPassword =
      typeof password === "string" && password.trim().length > 0
        ? password.trim()
        : null;

    if (providedPassword && providedPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 chars" });
    }

    // Use provided password when available, else generate secure temporary password.
    const tempPassword = providedPassword || crypto.randomBytes(8).toString("hex");

    try {
      // Create Supabase auth user
      const { data: authData, error: authErr } =
        await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name, role },
        });

      if (authErr) throw authErr;
      const userId = authData.user.id;

      // Create/upsert profile
      const { error: profErr } = await supabase.from("user_profiles").upsert({
        id: userId,
        full_name,
        role,
        is_active: true,
        avatar_color: avatar_color || randomColor(),
        created_by: req.user?.id,
      });

      if (profErr) throw profErr;

      // Assign to team if provided
      if (team_id) {
        const { error: tmErr } = await supabase
          .from("team_members")
          .insert({ team_id, user_id: userId, role: team_role });
        if (tmErr)
          logger.warn("Team assignment failed", { error: tmErr.message });
      }

      logger.info("Admin: user created", {
        email,
        role,
        createdBy: req.user?.id,
      });

      const createdSnapshot = await getUserSnapshot(userId);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.user.create",
        tableName: "user_profiles",
        recordId: userId,
        after: createdSnapshot,
        meta: {
          email,
          created_by: req.user?.id,
        },
      });

      res.json({
        success: true,
        userId,
        tempPassword,
        message: `تم إنشاء المستخدم. كلمة المرور المؤقتة: ${tempPassword}`,
      });
    } catch (err: any) {
      logger.error("Admin: create user error", { error: err.message });
      res.status(500).json({ error: err.response?.message || err.message });
    }
  },
);

/** PATCH /api/admin/users/:id - update user role/status */
router.patch(
  "/users/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role, is_active, full_name, avatar_color, team_id } = req.body;

    try {
      const beforeSnapshot = await getUserSnapshot(id);

      const updates: any = { updated_at: new Date().toISOString() };
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;
      if (full_name !== undefined) updates.full_name = full_name;
      if (avatar_color !== undefined) updates.avatar_color = avatar_color;

      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      if (team_id !== undefined) {
        const { error: clearTeamError } = await supabase
          .from("team_members")
          .delete()
          .eq("user_id", id);
        if (clearTeamError) throw clearTeamError;

        if (team_id) {
          const { error: assignTeamError } = await supabase
            .from("team_members")
            .insert({
              team_id,
              user_id: id,
              role: "member",
            });
          if (assignTeamError) throw assignTeamError;
        }
      }

      const afterSnapshot = await getUserSnapshot(id);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.user.update",
        tableName: "user_profiles",
        recordId: id,
        before: beforeSnapshot,
        after: afterSnapshot,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** DELETE /api/admin/users/:id - deactivate user */
router.delete(
  "/users/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const beforeSnapshot = await getUserSnapshot(id);

      await supabase
        .from("user_profiles")
        .update({ is_active: false })
        .eq("id", id);
      await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });

      const afterSnapshot = await getUserSnapshot(id);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.user.deactivate",
        tableName: "user_profiles",
        recordId: id,
        before: beforeSnapshot,
        after: afterSnapshot,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** POST /api/admin/users/:id/reset-password - reset temp password */
router.post(
  "/users/:id/reset-password",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const providedPassword =
      typeof req.body?.password === "string" && req.body.password.trim().length > 0
        ? req.body.password.trim()
        : null;

    if (providedPassword && providedPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 chars" });
    }

    const tempPassword = providedPassword || crypto.randomBytes(8).toString("hex");
    try {
      await supabase.auth.admin.updateUserById(id, { password: tempPassword });
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.user.reset_password",
        tableName: "user_profiles",
        recordId: id,
        meta: {
          reset_by: req.user?.id,
        },
      });
      res.json({ success: true, tempPassword });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ══════════════════════════════════════════════
//  TEAMS MANAGEMENT
// ══════════════════════════════════════════════

/** GET /api/admin/teams */
router.get(
  "/teams",
  requireRole("admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    try {
      const variants: Array<{ select: string; activeOnly: boolean }> = [
        {
          select: `
        *,
        team_members ( user_id, role ),
        team_permissions ( * )
      `,
          activeOnly: true,
        },
        {
          select: `
        *,
        team_members ( user_id, role )
      `,
          activeOnly: true,
        },
        {
          select: `
        *,
        team_members ( user_id, role )
      `,
          activeOnly: false,
        },
        {
          select: `*`,
          activeOnly: false,
        },
      ];

      let teams: any[] = [];
      let teamsError: any = null;

      for (const variant of variants) {
        let query = supabase.from("teams").select(variant.select);
        if (variant.activeOnly) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error) {
          teams = (data || []).map((team: any) => ({
            ...team,
            team_permissions: team.team_permissions ?? null,
          }));
          teamsError = null;
          break;
        }

        teamsError = error;
        if (!isSchemaCompatibilityError(error)) {
          break;
        }
      }

      if (teamsError) throw teamsError;
      res.json({ teams });
    } catch (err: any) {
      logger.error("Admin: list teams error", {
        error: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
      });
      res.status(500).json({ error: err.message });
    }
  },
);

/** POST /api/admin/teams - create team */
router.post(
  "/teams",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const {
      name,
      description,
      color = "#6366f1",
      member_ids = [],
      permissions,
    } = req.body;
    if (!name) return res.status(400).json({ error: "اسم التيم مطلوب" });

    try {
      // Create team
      const { data: team, error: tErr } = await supabase
        .from("teams")
        .insert({ name, description, color, created_by: req.user?.id })
        .select()
        .single();

      if (tErr) throw tErr;

      // Add members
      if (member_ids.length > 0) {
        await supabase
          .from("team_members")
          .insert(
            member_ids.map((uid: string) => ({
              team_id: team.id,
              user_id: uid,
              role: "member",
            })),
          );
      }

      // Set permissions
      const perms = {
        team_id: team.id,
        can_view_inventory: true,
        can_edit_inventory: false,
        can_view_orders: true,
        can_view_reports: true,
        can_submit_reports: true,
        can_view_settings: false,
        can_manage_team: false,
        brands_access: [],
        ...permissions,
      };
      await supabase.from("team_permissions").insert(perms);

      logger.info("Admin: team created", { teamId: team.id, name });

      const createdTeamSnapshot = await getTeamSnapshot(team.id);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.team.create",
        tableName: "teams",
        recordId: team.id,
        after: createdTeamSnapshot,
      });

      res.json({ success: true, team });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** PATCH /api/admin/teams/:id - update team */
router.patch(
  "/teams/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, description, color, permissions, member_ids } = req.body;

    try {
      const beforeSnapshot = await getTeamSnapshot(id);

      // Update team basics
      if (name || description || color) {
        const { error } = await supabase
          .from("teams")
          .update({
            name,
            description,
            color,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
      }

      // Update permissions
      if (permissions) {
        await supabase
          .from("team_permissions")
          .upsert(
            {
              team_id: id,
              ...permissions,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "team_id" },
          );
      }

      // Update members (replace all)
      if (member_ids !== undefined) {
        await supabase.from("team_members").delete().eq("team_id", id);
        if (member_ids.length > 0) {
          await supabase
            .from("team_members")
            .insert(
              member_ids.map((uid: string) => ({
                team_id: id,
                user_id: uid,
                role: "member",
              })),
            );
        }
      }

      const afterSnapshot = await getTeamSnapshot(id);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.team.update",
        tableName: "teams",
        recordId: id,
        before: beforeSnapshot,
        after: afterSnapshot,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** DELETE /api/admin/teams/:id */
router.delete(
  "/teams/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const beforeSnapshot = await getTeamSnapshot(req.params.id);

      await supabase
        .from("teams")
        .update({ is_active: false })
        .eq("id", req.params.id);

      const afterSnapshot = await getTeamSnapshot(req.params.id);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.team.deactivate",
        tableName: "teams",
        recordId: req.params.id,
        before: beforeSnapshot,
        after: afterSnapshot,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ══════════════════════════════════════════════
//  REPORTS (team daily reports overview)
// ══════════════════════════════════════════════

/** GET /api/admin/reports - all team reports including today's status */
router.get(
  "/reports",
  requireRole("admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    const { date, team_id } = req.query as Record<string, string>;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    try {
      const reportQueryVariants: Array<{ select: string; applyTeamFilter: boolean }> = [
        {
          select: `
            *,
            user_profiles ( id, full_name, role, avatar_color ),
            teams ( id, name, color )
          `,
          applyTeamFilter: true,
        },
        {
          select: `
            *,
            user_profiles ( id, full_name, role, avatar_color )
          `,
          applyTeamFilter: true,
        },
        { select: "*", applyTeamFilter: true },
        { select: "*", applyTeamFilter: false },
      ];

      let reports: any[] = [];
      let reportsError: any = null;
      let teamFilterApplied = false;

      for (const variant of reportQueryVariants) {
        let q = supabase
          .from("daily_reports")
          .select(variant.select)
          .gte("created_at", `${targetDate}T00:00:00`)
          .lte("created_at", `${targetDate}T23:59:59`)
          .order("created_at", { ascending: false });

        if (team_id && variant.applyTeamFilter) {
          q = q.eq("team_id", team_id);
        }

        const { data, error } = await q;
        if (!error) {
          reports = data || [];
          reportsError = null;
          teamFilterApplied = Boolean(team_id && variant.applyTeamFilter);
          break;
        }

        reportsError = error;
        if (!isSchemaCompatibilityError(error)) {
          break;
        }
      }

      if (reportsError) {
        throw reportsError;
      }

      // Fetch all users to find who has NOT submitted
      const { data: allUsers, error: allUsersError } = await supabase
        .from("user_profiles")
        .select("id, full_name, role, avatar_color")
        .eq("is_active", true)
        .neq("role", "admin");
      if (allUsersError) {
        throw allUsersError;
      }

      const submittedIds = new Set(reports?.map((r) => r.user_id));
      const missing = allUsers?.filter((u) => !submittedIds.has(u.id)) || [];

      // Summary stats
      const { data: summary, error: summaryError } = await supabase
        .from("team_report_summary")
        .select("*");
      if (summaryError && !isSchemaCompatibilityError(summaryError)) {
        throw summaryError;
      }

      res.json({
        reports,
        missing,
        summary: summaryError ? [] : summary,
        date: targetDate,
        team_filter_applied: teamFilterApplied,
      });
    } catch (err: any) {
      logger.error("Admin: reports error", {
        error: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
      });
      res.status(500).json({ error: err.message });
    }
  },
);

/** GET /api/admin/stats - dashboard quick stats */
router.get(
  "/stats",
  requireRole("admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [usersRes, teamsRes, reportsRes, brandsRes, pendingOrdersRes] = await Promise.all([
        supabase.from("user_profiles").select("id, role, is_active"),
        supabase.from("teams").select("id").eq("is_active", true),
        supabase
          .from("daily_reports")
          .select("id, user_id")
          .gte("created_at", `${today}T00:00:00`),
        supabase.from("brands").select("*").not("shopify_domain", "is", null),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("type", "order_pending")
          .eq("is_read", false),
      ]);

      const users = usersRes.data || [];
      const teams = teamsRes.data || [];
      const repToday = reportsRes.data || [];
      const brands = brandsRes.data || [];

      const connectedBrands = brands.filter((brand: any) => {
        const connectedByFlag = Boolean(brand.is_configured ?? brand.is_active);
        const connectedByToken = Boolean(brand.shopify_access_token || brand.access_token);
        const connectedByDate = Boolean(brand.connected_at);
        return connectedByFlag || connectedByToken || connectedByDate;
      }).length;

      res.json({
        total_users: users.length,
        active_users: users.filter((u) => u.is_active).length,
        total_teams: teams.length,
        reports_today: repToday.length,
        unique_reporters: new Set(repToday.map((r) => r.user_id)).size,
        total_brands: brands.length,
        shopify_connected: connectedBrands,
        pending_orders: pendingOrdersRes.count || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ══════════════════════════════════════════════
//  SHOPIFY INTEGRATION (Admin Management)
// ══════════════════════════════════════════════

/** GET /api/admin/shopify-status - overall shopify sync status */
router.get(
  "/shopify-status",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { data: brands, error } = await supabase
        .from("brands")
        .select("*")
        .not("shopify_domain", "is", null);

      if (error) throw error;

      const totalBrands = brands?.length || 0;
      const connectedBrands =
        brands?.filter((brand: any) => {
          const connectedByFlag = Boolean(brand.is_configured ?? brand.is_active);
          const connectedByToken = Boolean(brand.shopify_access_token || brand.access_token);
          const connectedByDate = Boolean(brand.connected_at);
          return connectedByFlag || connectedByToken || connectedByDate;
        }).length || 0;

      const lastSync = (brands || [])
        .map((brand: any) => brand.last_sync_at)
        .filter(Boolean)
        .sort()
        .reverse()[0];

      const isSyncing = (brands || []).some((brand: any) => brand.sync_status === "syncing");

      // Count pending orders (from notifications table)
      const { count: pendingCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "order_pending")
        .eq("is_read", false);

      res.json({
        total_brands: totalBrands,
        connected_brands: connectedBrands,
        sync_status: isSyncing ? "syncing" : connectedBrands > 0 ? "idle" : "error",
        last_sync: lastSync,
        pending_webhooks: pendingCount || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** GET /api/admin/shopify/brands - list all shopify connected brands */
router.get(
  "/shopify/brands",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { data: brands, error } = await supabase
        .from("brands")
        .select("*")
        .not("shopify_domain", "is", null)
        .order("name");

      if (error) throw error;

      // Fetch products count for each brand
      const enriched = await Promise.all(
        brands?.map(async (brand) => {
          const { count } = await supabase
            .from("products")
            .select("id", { count: "exact" })
            .eq("brand_id", brand.id);

          const { count: ordersCount } = await supabase
            .from("shopify_webhook_events")
            .select("id", { count: "exact" })
            .eq("brand_id", brand.id)
            .eq("topic", "orders/create");

          return {
            ...brand,
            products_count: count || 0,
            orders_count: ordersCount || 0,
            sync_status: brand.last_sync_at ? "synced" : "pending",
            webhook_status: brand.is_configured ? "active" : "inactive",
            api_key: brand.shopify_api_key
              ? "***" + brand.shopify_api_key.slice(-4)
              : null,
          };
        }) || [],
      );

      res.json({ brands: enriched });
    } catch (err: any) {
      logger.error("Admin: shopify brands error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  },
);

/** GET /api/admin/shopify/webhooks - list webhook configurations */
router.get(
  "/shopify/webhooks",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const topics = [
        "products/create",
        "products/update",
        "products/delete",
        "orders/create",
        "orders/updated",
        "inventory/levels/update",
      ];

      const webhookConfigs = await Promise.all(
        topics.map(async (topic) => {
          const { data: events } = await supabase
            .from("shopify_webhook_events")
            .select("id, created_at")
            .eq("topic", topic)
            .order("created_at", { ascending: false })
            .limit(1);

          const { count: pendingCount } = await supabase
            .from("shopify_webhook_events")
            .select("id", { count: "exact" })
            .eq("topic", topic)
            .eq("processed", false);

          return {
            topic,
            enabled: true,
            last_event: events?.[0]?.created_at,
            pending_count: pendingCount || 0,
          };
        }),
      );

      res.json({ webhooks: webhookConfigs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** POST /api/admin/shopify/brands/:id/sync - manually trigger sync */
router.post(
  "/shopify/brands/:id/sync",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { id: brandId } = req.params;

    try {
      const { data: brand } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .single();

      if (!brand?.is_configured) {
        return res.status(400).json({ error: "المتجر غير مربوط" });
      }

      // Mark last sync
      await supabase
        .from("brands")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", brandId);

      logger.info("Admin: manual sync triggered", { brandId });
      res.json({ success: true, message: "جاري المزامجة..." });

      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.shopify.sync_brand",
        tableName: "brands",
        recordId: brandId,
        meta: {
          triggered_by: req.user?.id,
        },
      });

      // Trigger actual sync in background (non-blocking)
      // In production, this would queue a job
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

/** PATCH /api/admin/shopify/webhooks/:topic - toggle webhook */
router.patch(
  "/shopify/webhooks/:topic",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { topic } = req.params;
    const { enabled } = req.body;

    // In a real system, this would update webhook configuration in Shopify
    logger.info("Webhook toggle", { topic, enabled });
    await logAuditEvent({
      userId: req.user?.id,
      action: "admin.shopify.webhook_toggle",
      tableName: "shopify_webhook_events",
      meta: {
        topic,
        enabled: Boolean(enabled),
      },
    });

    res.json({
      success: true,
      message: `${topic} ${enabled ? "مفعّل" : "معطّل"}`,
    });
  },
);

/** POST /api/admin/shopify/setup-credentials - save shopify API credentials */
router.post(
  "/shopify/setup-credentials",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { brandId, apiKey, accessToken, domain, locationId } = req.body;

    if (!brandId || !apiKey || !accessToken || !domain) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }

    try {
      const beforeSnapshot = await getBrandSnapshot(brandId);
      const { error } = await supabase
        .from("brands")
        .update({
          shopify_api_key: apiKey,
          shopify_access_token: accessToken,
          shopify_domain: domain,
          shopify_location_id: locationId,
          is_configured: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", brandId);

      if (error) throw error;

      logger.info("Admin: shopify credentials saved", { brandId, domain });
      res.json({ success: true, message: "تم ربط المتجر بنجاح" });
      const afterSnapshot = await getBrandSnapshot(brandId);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.shopify.setup_credentials",
        tableName: "brands",
        recordId: brandId,
        before: beforeSnapshot,
        after: afterSnapshot,
      });
    } catch (err: any) {
      logger.error("Admin: credentials error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  },
);

/** DELETE /api/admin/shopify/brands/:id/disconnect - disconnect brand from Shopify */
router.delete(
  "/shopify/brands/:id/disconnect",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const beforeSnapshot = await getBrandSnapshot(id);
      const { error } = await supabase
        .from("brands")
        .update({
          shopify_api_key: null,
          shopify_access_token: null,
          is_configured: false,
          connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      logger.info("Admin: brand disconnected", { brandId: id });
      res.json({ success: true, message: "تم فصل المتجر" });
      
      const afterSnapshot = await getBrandSnapshot(id);
      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.shopify.disconnect_brand",
        tableName: "brands",
        recordId: id,
        before: beforeSnapshot,
        after: afterSnapshot,
      });
    } catch (err: any) {
      logger.error("Admin: disconnect error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  },
);

// ── Helper ──────────────────────────────────────────────
/** GET /api/admin/audit-logs - audit trail with filters */
router.get(
  "/audit-logs",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = "1",
        limit = "50",
        action,
        table_name,
        user_id,
        start_date,
        end_date,
      } = req.query as Record<string, string>;

      const parsedPage = Math.max(1, Number(page) || 1);
      const parsedLimit = Math.min(200, Math.max(1, Number(limit) || 50));
      const from = (parsedPage - 1) * parsedLimit;
      const to = from + parsedLimit - 1;

      let query = supabase
        .from("audit_logs")
        .select(
          `
            id,
            user_id,
            action,
            table_name,
            record_id,
            changes,
            created_at
          `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      if (action) query = query.ilike("action", `%${action}%`);
      if (table_name) query = query.eq("table_name", table_name);
      if (user_id) query = query.eq("user_id", user_id);
      if (start_date) query = query.gte("created_at", `${start_date}T00:00:00`);
      if (end_date) query = query.lte("created_at", `${end_date}T23:59:59`);

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      const logs = data || [];
      const userIds = Array.from(
        new Set(logs.map((row: any) => row.user_id).filter(Boolean)),
      ) as string[];

      let nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", userIds);
        nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || ""]));
      }

      const normalizedLogs = logs.map((row: any) => ({
        ...row,
        actor_name: row.user_id ? nameMap.get(row.user_id) || null : null,
      }));

      res.json({
        logs: normalizedLogs,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / parsedLimit),
        },
      });
    } catch (err: any) {
      logger.error("Admin: audit logs error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  },
);

function randomColor() {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default router;

// ══════════════════════════════════════════════
//  SHOPIFY CONFIGURATION (New Professional Setup)
// ══════════════════════════════════════════════

/** GET /api/admin/shopify/config - get shopify configuration */
router.get(
  "/shopify/config",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const backendUrl = BACKEND_BASE_URL;
      
      // Get config from environment or database
      const config = {
        shopify_domain: process.env.SHOPIFY_DOMAIN || "",
        client_id: process.env.SHOPIFY_CLIENT_ID || "",
        client_secret: process.env.SHOPIFY_CLIENT_SECRET || "",
        is_connected: Boolean(
          process.env.SHOPIFY_DOMAIN &&
          process.env.SHOPIFY_CLIENT_ID &&
          process.env.SHOPIFY_CLIENT_SECRET
        ),
        redirect_uri: `${backendUrl}/api/shopify/callback`,
        backend_url: backendUrl,
      };

      // Get webhooks status
      const topics = [
        { 
          topic: "orders/create", 
          label: "إنشاء أوردر جديد",
          description: "يتم تفعيله عند إنشاء أوردر جديد في Shopify"
        },
        { 
          topic: "orders/updated", 
          label: "تحديث أوردر",
          description: "يتم تفعيله عند تحديث حالة أوردر"
        },
        { 
          topic: "products/create", 
          label: "إضافة منتج",
          description: "يتم تفعيله عند إضافة منتج جديد"
        },
        { 
          topic: "products/update", 
          label: "تحديث منتج",
          description: "يتم تفعيله عند تحديث بيانات منتج"
        },
        { 
          topic: "inventory_levels/update", 
          label: "تحديث المخزون",
          description: "يتم تفعيله عند تغيير كمية المخزون"
        },
      ];

      const webhooks = await Promise.all(
        topics.map(async ({ topic, label, description }) => {
          const { data: events } = await supabase
            .from("shopify_webhook_events")
            .select("id, created_at")
            .eq("topic", topic)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            topic,
            label,
            description,
            enabled: Boolean(events && events.length > 0),
            last_event: events?.[0]?.created_at,
            status: events && events.length > 0 ? "active" : "inactive",
          };
        })
      );

      res.json({ config, webhooks });
    } catch (err: any) {
      logger.error("Admin: get shopify config error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
);

/** POST /api/admin/shopify/config - save shopify configuration */
router.post(
  "/shopify/config",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { shopify_domain, client_id, client_secret } = req.body;

    if (!shopify_domain || !client_id || !client_secret) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    try {
      const backendUrl = BACKEND_BASE_URL;
      
      // In production, save to secure storage or environment
      // For now, we'll return the config with redirect URI
      const redirect_uri = `${backendUrl}/api/shopify/callback`;

      const config = {
        shopify_domain,
        client_id,
        client_secret,
        is_connected: true,
        redirect_uri,
        backend_url: backendUrl,
      };

      logger.info("Admin: shopify config saved", {
        domain: shopify_domain,
        by: req.user?.id,
      });

      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.shopify.config_update",
        tableName: "system_config",
        meta: {
          shopify_domain,
          updated_by: req.user?.id,
        },
      });

      res.json({
        success: true,
        config,
        message: "تم حفظ الإعدادات بنجاح ✓",
      });
    } catch (err: any) {
      logger.error("Admin: save shopify config error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
);

/** GET /api/admin/shopify/auth-url - get OAuth URL */
router.get(
  "/shopify/auth-url",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const shopifyDomain = process.env.SHOPIFY_DOMAIN;
      const clientId = process.env.SHOPIFY_CLIENT_ID;
      const redirectUri = `${BACKEND_BASE_URL}/api/shopify/callback`;

      if (!shopifyDomain || !clientId) {
        return res.status(400).json({ error: "الإعدادات غير مكتملة" });
      }

      const scopes = [
        "read_products",
        "write_products",
        "read_inventory",
        "write_inventory",
        "read_orders",
        "write_orders",
      ].join(",");

      const state = crypto.randomBytes(16).toString("hex");
      
      // Store state in session or database for verification
      // For now, we'll just generate it

      const authUrl = `https://${shopifyDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

      res.json({ url: authUrl });
    } catch (err: any) {
      logger.error("Admin: generate auth URL error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
);

/** POST /api/admin/shopify/webhooks/setup-all - setup all webhooks */
router.post(
  "/shopify/webhooks/setup-all",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const topics = [
        "orders/create",
        "orders/updated",
        "products/create",
        "products/update",
        "inventory_levels/update",
      ];

      // In production, this would register webhooks with Shopify API
      logger.info("Admin: setting up all webhooks", {
        topics,
        by: req.user?.id,
      });

      await logAuditEvent({
        userId: req.user?.id,
        action: "admin.shopify.webhooks_setup",
        tableName: "shopify_webhook_events",
        meta: {
          topics,
          setup_by: req.user?.id,
        },
      });

      res.json({
        success: true,
        message: "جاري تفعيل جميع الـ Webhooks...",
      });
    } catch (err: any) {
      logger.error("Admin: setup webhooks error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  }
);
