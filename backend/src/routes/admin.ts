import { Router, Response } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import crypto from "crypto";

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);

// ══════════════════════════════════════════════
//  USERS MANAGEMENT
// ══════════════════════════════════════════════

/** GET /api/admin/users - list all users */
router.get(
  "/users",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { data: users, error } = await supabase
        .from("user_profiles")
        .select(
          `
        id, full_name, role, is_active, avatar_color, created_at,
        team_members (
          team_id,
          role,
          teams ( id, name, color )
        )
      `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get emails from auth.users (admin-only view)
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const emailMap = new Map(
        authUsers?.users?.map((u) => [u.id, u.email]) ?? [],
      );

      const result = users?.map((u) => ({
        ...u,
        email: emailMap.get(u.id) || "",
      }));
      res.json({ users: result });
    } catch (err: any) {
      logger.error("Admin: list users error", { error: err.message });
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
      await supabase
        .from("user_profiles")
        .update({ is_active: false })
        .eq("id", id);
      await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });
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
      const { data: teams, error } = await supabase
        .from("teams")
        .select(
          `
        *,
        team_members ( user_id, role ),
        team_permissions ( * )
      `,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json({ teams });
    } catch (err: any) {
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
      await supabase
        .from("teams")
        .update({ is_active: false })
        .eq("id", req.params.id);
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
      let q = supabase
        .from("daily_reports")
        .select(
          `
        *,
        user_profiles ( id, full_name, role, avatar_color ),
        teams ( id, name, color )
      `,
        )
        .gte("created_at", `${targetDate}T00:00:00`)
        .lte("created_at", `${targetDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (team_id) q = q.eq("team_id", team_id);

      const { data: reports, error } = await q;
      if (error) throw error;

      // Fetch all users to find who has NOT submitted
      const { data: allUsers } = await supabase
        .from("user_profiles")
        .select("id, full_name, role, avatar_color")
        .eq("is_active", true)
        .neq("role", "admin");

      const submittedIds = new Set(reports?.map((r) => r.user_id));
      const missing = allUsers?.filter((u) => !submittedIds.has(u.id)) || [];

      // Summary stats
      const { data: summary } = await supabase
        .from("team_report_summary")
        .select("*");

      res.json({ reports, missing, summary, date: targetDate });
    } catch (err: any) {
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
      const { error } = await supabase
        .from("brands")
        .update({
          shopify_api_key: apiKey,
          shopify_access_token: accessToken,
          shopify_domain: domain,
          shopify_location_id: locationId,
          is_configured: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brandId);

      if (error) throw error;

      logger.info("Admin: shopify credentials saved", { brandId, domain });
      res.json({ success: true, message: "تم ربط المتجر بنجاح" });
    } catch (err: any) {
      logger.error("Admin: credentials error", { error: err.message });
      res.status(500).json({ error: err.message });
    }
  },
);

// ── Helper ──────────────────────────────────────────────
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
