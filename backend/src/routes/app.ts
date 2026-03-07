import { Router, Response } from "express";
import crypto from "crypto";
import axios from "axios";
import {
  authenticate,
  AuthRequest,
  requireStoreContext,
  requireStorePermission,
  requireStoreRole,
} from "../middleware/auth";
import { supabase } from "../config/supabase";
import { getShopifyConfig } from "../config/shopify";
import { logger } from "../utils/logger";
import {
  assertStoreScope,
  isSchemaCompatibilityError,
  resolveStoreId,
} from "../utils/storeContext";
import { InventoryService } from "../services/inventory";
import { ShopifyService } from "../services/shopify";
import { ShopifySyncService } from "../services/shopifySync";
import { logAuditEvent } from "../utils/auditLogger";

const router = Router();
const inventoryService = new InventoryService();
const shopifySyncService = new ShopifySyncService();

router.use(authenticate);

// Routes that don't require store context
router.get("/me", async (req: AuthRequest, res: Response) => {
  const storeId = resolveStoreId(req);

  try {
    let safeStore: any = null;
    if (storeId) {
      const store = await supabase
        .from("stores")
        .select("id, name, slug, status, admin_user_id, owner_user_id")
        .eq("id", storeId)
        .maybeSingle();
      safeStore =
        store.data ||
        ({
          id: storeId,
          name: "Store",
          slug: null,
          status: "active",
          admin_user_id: null,
        } as any);
    }

    return res.json({
      user: {
        id: req.user?.id,
        email: req.user?.email || null,
        store_role: req.user?.storeRole || null,
        permissions: req.user?.permissions || {},
      },
      store: safeStore,
      profile: req.user?.profile || null,
    });
  } catch (error: any) {
    logger.error("App /me failed", { error: error?.message });
    return res
      .status(500)
      .json({ error: "Failed to load current user context" });
  }
});

// All other routes require store context
router.use(requireStoreContext());

function parseNumber(input: unknown, fallback: number): number {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

function resolveBackendUrl(req: AuthRequest): string {
  const explicit = (
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    ""
  ).trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || req.get("host") || "";
  if (host) {
    const protocol =
      forwardedProto || (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }
  return `http://localhost:${process.env.PORT || "3002"}`;
}

function normalizeShopDomain(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");
  if (!normalized.endsWith(".myshopify.com"))
    return `${normalized}.myshopify.com`;
  return normalized;
}

function truncateText(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input;
}

function makeLegacyBrandName(storeName: string, storeId: string): string {
  const suffix = storeId.replace(/-/g, "").slice(0, 6);
  return truncateText(`${storeName}-${suffix}`, 100);
}

async function resolveStoreDisplayName(storeId: string): Promise<string> {
  const store = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .maybeSingle();
  if (!store.error && store.data?.name) {
    return String(store.data.name);
  }
  return "Store";
}

async function upsertLegacyBrandForStore(params: {
  storeId: string;
  shopDomain: string;
  apiKey: string;
  apiSecret: string;
}): Promise<void> {
  const { storeId, shopDomain, apiKey, apiSecret } = params;
  const existing = await supabase
    .from("brands")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();
  if (existing.error) {
    if (isSchemaCompatibilityError(existing.error)) {
      return;
    }
    throw existing.error;
  }

  const now = nowIso();
  if (existing.data) {
    const updatePayload: Record<string, unknown> = {
      shopify_domain: shopDomain,
      updated_at: now,
    };
    if (Object.prototype.hasOwnProperty.call(existing.data, "api_key"))
      updatePayload.api_key = apiKey;
    if (Object.prototype.hasOwnProperty.call(existing.data, "shopify_api_key"))
      updatePayload.shopify_api_key = apiKey;
    if (Object.prototype.hasOwnProperty.call(existing.data, "api_secret"))
      updatePayload.api_secret = apiSecret;

    const update = await supabase
      .from("brands")
      .update(updatePayload)
      .eq("id", storeId);
    if (update.error && !isSchemaCompatibilityError(update.error)) {
      throw update.error;
    }
    return;
  }

  const storeName = await resolveStoreDisplayName(storeId);
  const suffix = storeId.replace(/-/g, "").slice(0, 6);
  const canonicalName = makeLegacyBrandName(storeName, storeId);
  const canonicalDomain = shopDomain || `pending-${suffix}.myshopify.com`;
  const insertPayloads: Array<Record<string, unknown>> = [
    {
      id: storeId,
      name: canonicalName,
      shopify_domain: canonicalDomain,
      shopify_location_id: "pending",
      api_key: apiKey,
      api_secret: apiSecret,
      shopify_api_key: apiKey,
      is_active: true,
      is_configured: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: storeId,
      name: canonicalName,
      shopify_domain: canonicalDomain,
      shopify_location_id: "pending",
      is_active: true,
      is_configured: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: storeId,
      name: canonicalName,
      shopify_domain: canonicalDomain,
      shopify_location_id: "pending",
      created_at: now,
      updated_at: now,
    },
    {
      id: storeId,
      name: canonicalName,
      shopify_domain: canonicalDomain,
      shopify_location_id: "pending",
    },
    {
      id: storeId,
      name: canonicalName,
      shopify_domain: canonicalDomain,
    },
  ];

  let lastError: any = null;
  for (const payload of insertPayloads) {
    const insert = await supabase.from("brands").insert(payload);
    if (!insert.error) {
      return;
    }

    lastError = insert.error;
    if (String(insert.error.code || "") === "23505") {
      return;
    }
    if (!isSchemaCompatibilityError(insert.error)) {
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }
}

async function clearLegacyBrandConnection(storeId: string): Promise<void> {
  const existing = await supabase
    .from("brands")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();
  if (existing.error) {
    if (isSchemaCompatibilityError(existing.error)) {
      return;
    }
    throw existing.error;
  }
  if (!existing.data) {
    return;
  }

  const updates: Record<string, unknown> = {
    updated_at: nowIso(),
    connected_at: null,
  };
  if (
    Object.prototype.hasOwnProperty.call(existing.data, "shopify_access_token")
  )
    updates.shopify_access_token = null;
  if (Object.prototype.hasOwnProperty.call(existing.data, "access_token"))
    updates.access_token = null;
  if (Object.prototype.hasOwnProperty.call(existing.data, "shopify_scopes"))
    updates.shopify_scopes = null;
  if (
    Object.prototype.hasOwnProperty.call(existing.data, "shopify_location_id")
  )
    updates.shopify_location_id = null;
  if (Object.prototype.hasOwnProperty.call(existing.data, "is_configured"))
    updates.is_configured = false;
  if (Object.prototype.hasOwnProperty.call(existing.data, "is_active"))
    updates.is_active = false;

  const update = await supabase
    .from("brands")
    .update(updates)
    .eq("id", storeId);
  if (update.error && !isSchemaCompatibilityError(update.error)) {
    throw update.error;
  }
}

function canViewFinance(req: AuthRequest): boolean {
  if (req.user?.storeRole === "admin") return true;
  if (req.user?.permissions?.["finance.view_cost"]) return true;
  if (req.user?.permissions?.["finance.view_profit"]) return true;
  if (req.user?.permissions?.can_view_finance) return true;
  return false;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumNetProfitRows(rows: Array<Record<string, unknown>>): number | null {
  if (!rows.length) return null;
  const total = rows.reduce((sum, row) => {
    const value = toNullableNumber(row.net_profit);
    return value === null ? sum : sum + value;
  }, 0);
  return Number.isFinite(total) ? total : null;
}

async function fetchLatestOrderScoped(
  storeId: string,
): Promise<Record<string, unknown> | null> {
  const select =
    "id, shopify_order_id, order_name, order_number, currency, created_at_shopify, updated_at, store_id, brand_id";

  let latest = await supabase
    .from("shopify_orders")
    .select(select)
    .eq("store_id", storeId)
    .order("created_at_shopify", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (latest.error && isSchemaCompatibilityError(latest.error)) {
    latest = await supabase
      .from("shopify_orders")
      .select(select)
      .eq("brand_id", storeId)
      .order("created_at_shopify", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
  }

  if (latest.error) {
    throw latest.error;
  }
  return (latest.data as Record<string, unknown> | null) || null;
}

async function fetchAllNetProfitRowsScoped(params: {
  table: string;
  scopeColumn: "store_id" | "brand_id";
  storeId: string;
}): Promise<Array<Record<string, unknown>>> {
  const pageSize = 1000;
  const rows: Array<Record<string, unknown>> = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const result = await supabase
      .from(params.table)
      .select("net_profit")
      .eq(params.scopeColumn, params.storeId)
      .range(from, to);

    if (result.error) {
      throw result.error;
    }

    const pageRows = (result.data || []) as Array<Record<string, unknown>>;
    rows.push(...pageRows);
    hasMore = pageRows.length === pageSize;
    page += 1;
  }

  return rows;
}

async function fetchTotalNetProfit(storeId: string): Promise<number | null> {
  try {
    const financialRows = await fetchAllNetProfitRowsScoped({
      table: "order_financials",
      scopeColumn: "store_id",
      storeId,
    });
    const total = sumNetProfitRows(financialRows);
    if (total !== null) {
      return total;
    }
  } catch (error: any) {
    if (!isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  try {
    const orderRows = await fetchAllNetProfitRowsScoped({
      table: "shopify_orders",
      scopeColumn: "store_id",
      storeId,
    });
    const total = sumNetProfitRows(orderRows);
    if (total !== null) {
      return total;
    }
  } catch (error: any) {
    if (!isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  try {
    const fallbackRows = await fetchAllNetProfitRowsScoped({
      table: "shopify_orders",
      scopeColumn: "brand_id",
      storeId,
    });
    return sumNetProfitRows(fallbackRows);
  } catch (error: any) {
    if (!isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  return null;
}

async function fetchLatestNetProfit(
  storeId: string,
  latestOrderId: string,
): Promise<number | null> {
  try {
    const byFinancials = await supabase
      .from("order_financials")
      .select("net_profit")
      .eq("store_id", storeId)
      .eq("order_id", latestOrderId)
      .maybeSingle();

    if (!byFinancials.error) {
      return toNullableNumber(byFinancials.data?.net_profit);
    }
    if (!isSchemaCompatibilityError(byFinancials.error)) {
      throw byFinancials.error;
    }
  } catch (error: any) {
    if (!isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  try {
    const byOrders = await supabase
      .from("shopify_orders")
      .select("net_profit")
      .eq("id", latestOrderId)
      .maybeSingle();

    if (!byOrders.error) {
      return toNullableNumber(byOrders.data?.net_profit);
    }
    if (!isSchemaCompatibilityError(byOrders.error)) {
      throw byOrders.error;
    }
  } catch (error: any) {
    if (!isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  return null;
}

async function countMembershipByStatus(
  storeId: string,
  status: "active" | "inactive",
): Promise<number> {
  const result = await supabase
    .from("store_memberships")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", status);

  if (result.error) {
    if (isSchemaCompatibilityError(result.error)) {
      return 0;
    }
    throw result.error;
  }

  return result.count || 0;
}

async function loadNetProfitSummary(storeId: string): Promise<{
  latestNetProfit: number | null;
  totalNetProfit: number | null;
  latestOrderName: string | null;
  latestOrderNumber: number | null;
  latestOrderCurrency: string | null;
  latestOrderAt: string | null;
}> {
  const latestOrder = await fetchLatestOrderScoped(storeId);
  const latestOrderId = latestOrder?.id ? String(latestOrder.id) : "";
  const latestNetProfit = latestOrderId
    ? await fetchLatestNetProfit(storeId, latestOrderId)
    : null;
  const totalNetProfit = await fetchTotalNetProfit(storeId);

  return {
    latestNetProfit,
    totalNetProfit,
    latestOrderName: latestOrder?.order_name
      ? String(latestOrder.order_name)
      : null,
    latestOrderNumber: toNullableNumber(latestOrder?.order_number),
    latestOrderCurrency: latestOrder?.currency
      ? String(latestOrder.currency)
      : null,
    latestOrderAt: latestOrder?.created_at_shopify
      ? String(latestOrder.created_at_shopify)
      : null,
  };
}

async function getStoreBrandConfigOrThrow(storeId: string) {
  const brand = await supabase
    .from("brands")
    .select(
      "id, name, shopify_domain, shopify_access_token, access_token, shopify_location_id",
    )
    .eq("id", storeId)
    .maybeSingle();

  if (brand.error) throw brand.error;
  if (!brand.data) {
    throw new Error("Store Shopify configuration is missing");
  }
  return brand.data as Record<string, unknown>;
}

function buildShopifyServiceFromBrand(
  brand: Record<string, unknown>,
): ShopifyService {
  const shopifyConfig = getShopifyConfig(String(brand.name || "store"), {
    domain: String(brand.shopify_domain || ""),
    accessToken: String(brand.shopify_access_token || ""),
    legacyAccessToken: String(brand.access_token || ""),
    locationId: String(brand.shopify_location_id || ""),
  });
  return new ShopifyService(shopifyConfig);
}

async function syncProductDetailsToShopify(params: {
  storeId: string;
  shopifyProductId: string;
  updates: {
    title?: string | null;
    vendor?: string | null;
    product_type?: string | null;
    status?: string | null;
  };
}) {
  const hasSyncableFields =
    params.updates.title !== undefined ||
    params.updates.vendor !== undefined ||
    params.updates.product_type !== undefined ||
    params.updates.status !== undefined;
  if (!hasSyncableFields) return;

  const brand = await getStoreBrandConfigOrThrow(params.storeId);
  const shopifyService = buildShopifyServiceFromBrand(brand);
  await shopifyService.updateProduct(params.shopifyProductId, {
    title: params.updates.title,
    vendor: params.updates.vendor,
    productType: params.updates.product_type,
    status: params.updates.status,
  });
}

async function syncVariantDetailsToShopify(params: {
  storeId: string;
  shopifyVariantId: string;
  updates: {
    sku?: string | null;
    barcode?: string | null;
    price?: number | null;
    compare_at_price?: number | null;
  };
}) {
  const hasSyncableFields =
    params.updates.sku !== undefined ||
    params.updates.barcode !== undefined ||
    params.updates.price !== undefined ||
    params.updates.compare_at_price !== undefined;
  if (!hasSyncableFields) return;

  const brand = await getStoreBrandConfigOrThrow(params.storeId);
  const shopifyService = buildShopifyServiceFromBrand(brand);
  await shopifyService.updateVariant(params.shopifyVariantId, {
    sku: params.updates.sku,
    barcode: params.updates.barcode,
    price: params.updates.price,
    compareAtPrice: params.updates.compare_at_price,
  });
}

function ensureStoreId(req: AuthRequest, res: Response): string | null {
  const storeId = resolveStoreId(req);
  if (!storeId) {
    res.status(400).json({ error: "store_id context is required" });
    return null;
  }

  if (!assertStoreScope(req, storeId)) {
    res.status(403).json({ error: "Cross-store access is forbidden" });
    return null;
  }
  return storeId;
}

async function scopedSelect(
  table: string,
  select: string,
  storeId: string,
  opts?: {
    count?: "exact";
    single?: boolean;
    maybeSingle?: boolean;
    orderBy?: string;
    orderAsc?: boolean;
    limit?: number;
  },
) {
  let query: any = supabase
    .from(table)
    .select(select, opts?.count ? { count: opts.count } : undefined);
  query = query.eq("store_id", storeId);
  if (opts?.orderBy)
    query = query.order(opts.orderBy, { ascending: opts.orderAsc ?? false });
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.single) return query.single();
  if (opts?.maybeSingle) return query.maybeSingle();
  const first = await query;
  if (!first.error) return first;
  if (!isSchemaCompatibilityError(first.error)) return first;

  let fallback: any = supabase
    .from(table)
    .select(select, opts?.count ? { count: opts.count } : undefined);
  fallback = fallback.eq("brand_id", storeId);
  if (opts?.orderBy)
    fallback = fallback.order(opts.orderBy, {
      ascending: opts.orderAsc ?? false,
    });
  if (opts?.limit) fallback = fallback.limit(opts.limit);
  if (opts?.single) return fallback.single();
  if (opts?.maybeSingle) return fallback.maybeSingle();
  return fallback;
}

async function countScoped(table: string, storeId: string): Promise<number> {
  const result = await scopedSelect(table, "id", storeId, {
    count: "exact",
    limit: 1,
  });
  if (result.error) throw result.error;
  return result.count || 0;
}

router.get("/dashboard/overview", async (req: AuthRequest, res: Response) => {
  const storeId = ensureStoreId(req, res);
  if (!storeId) return;

  try {
    const [
      productsCount,
      ordersCount,
      customersCount,
      reportsCount,
      membersCount,
      membersActive,
      membersInactive,
    ] = await Promise.all([
      countScoped("products", storeId),
      countScoped("shopify_orders", storeId),
      countScoped("shopify_customers", storeId),
      countScoped("reports", storeId).catch(() => 0),
      countScoped("store_memberships", storeId).catch(() => 0),
      countMembershipByStatus(storeId, "active").catch(() => 0),
      countMembershipByStatus(storeId, "inactive").catch(() => 0),
    ]);
    const netProfitSummary = canViewFinance(req)
      ? await loadNetProfitSummary(storeId).catch((error: any) => {
          logger.warn(
            "Failed to load net profit summary for dashboard overview",
            {
              storeId,
              error: error?.message,
            },
          );
          return null;
        })
      : null;

    let stockResult = await supabase
      .from("inventory_levels")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .lte("available", 5);
    if (stockResult.error && isSchemaCompatibilityError(stockResult.error)) {
      stockResult = await supabase
        .from("inventory_levels")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", storeId)
        .lte("available", 5);
    }
    const lowStock = stockResult.error ? 0 : stockResult.count || 0;

    return res.json({
      overview: {
        products_total: productsCount,
        orders_total: ordersCount,
        customers_total: customersCount,
        reports_total: reportsCount,
        members_total: membersCount,
        members_active_total: membersActive,
        members_inactive_total: membersInactive,
        low_stock_total: lowStock,
        latest_net_profit: netProfitSummary?.latestNetProfit ?? null,
        total_net_profit: netProfitSummary?.totalNetProfit ?? null,
        latest_net_profit_order_name: netProfitSummary?.latestOrderName ?? null,
        latest_net_profit_order_number:
          netProfitSummary?.latestOrderNumber ?? null,
        latest_net_profit_currency:
          netProfitSummary?.latestOrderCurrency ?? null,
        latest_net_profit_at: netProfitSummary?.latestOrderAt ?? null,
      },
    });
  } catch (error: any) {
    logger.error("App dashboard overview failed", { error: error?.message });
    return res.status(500).json({ error: "Failed to load dashboard overview" });
  }
});

router.get(
  "/products",
  requireStorePermission("can_view_inventory"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    try {
      const search = String(req.query.search || "").trim();
      const page = Math.max(1, parseNumber(req.query.page, 1));
      const limit = Math.min(
        200,
        Math.max(1, parseNumber(req.query.limit, 50)),
      );
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query: any = supabase
        .from("variants")
        .select(
          `
        *,
        products ( id, title, handle, product_type, vendor, status ),
        brands ( name ),
        inventory_levels ( available )
      `,
          { count: "exact" },
        )
        .eq("store_id", storeId)
        .order("updated_at", { ascending: false });
      if (search)
        query = query.or(
          `sku.ilike.%${search}%,title.ilike.%${search}%,barcode.ilike.%${search}%`,
        );

      let { data, error, count } = await query.range(from, to);
      if (error && isSchemaCompatibilityError(error)) {
        let fallback: any = supabase
          .from("variants")
          .select(
            `
          *,
          products ( id, title, handle, product_type, vendor, status ),
          brands ( name ),
          inventory_levels ( available )
        `,
            { count: "exact" },
          )
          .eq("brand_id", storeId)
          .order("updated_at", { ascending: false });
        if (search)
          fallback = fallback.or(
            `sku.ilike.%${search}%,title.ilike.%${search}%,barcode.ilike.%${search}%`,
          );
        const fallbackResult = await fallback.range(from, to);
        data = fallbackResult.data;
        error = fallbackResult.error;
        count = fallbackResult.count;
      }

      if (error) throw error;

      return res.json({
        products: data || [],
        pagination: { page, limit, total: count || 0 },
      });
    } catch (error: any) {
      logger.error("App products list failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to load products" });
    }
  },
);

router.patch(
  "/products/:id",
  requireStorePermission("products.manage"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const productId = req.params.id;
    const updates = {
      title: req.body?.title,
      vendor: req.body?.vendor,
      product_type: req.body?.product_type,
      status: req.body?.status,
      updated_at: nowIso(),
    };
    const payload = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    try {
      let before = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (before.error && isSchemaCompatibilityError(before.error)) {
        before = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("brand_id", storeId)
          .maybeSingle();
      }
      if (before.error) throw before.error;
      if (!before.data)
        return res.status(404).json({ error: "Product not found" });

      const rowStoreId = String(
        (before.data as any).store_id || (before.data as any).brand_id || "",
      );
      if (!assertStoreScope(req, rowStoreId)) {
        return res
          .status(403)
          .json({ error: "Cross-store access is forbidden" });
      }

      const shopifyProductId = String(
        (before.data as any).shopify_product_id || "",
      ).trim();
      if (shopifyProductId) {
        try {
          await syncProductDetailsToShopify({
            storeId,
            shopifyProductId,
            updates: {
              title: req.body?.title,
              vendor: req.body?.vendor,
              product_type: req.body?.product_type,
              status: req.body?.status,
            },
          });
        } catch (syncError: any) {
          logger.error("App product update sync to Shopify failed", {
            productId,
            storeId,
            shopifyProductId,
            error: syncError?.message,
            details: syncError?.response?.data,
          });
          return res.status(502).json({
            error: "Failed to sync product update to Shopify",
            code: "shopify_product_update_failed",
          });
        }
      }

      let update = await supabase
        .from("products")
        .update(payload)
        .eq("id", productId)
        .eq("store_id", storeId);
      if (update.error && isSchemaCompatibilityError(update.error)) {
        update = await supabase
          .from("products")
          .update(payload)
          .eq("id", productId)
          .eq("brand_id", storeId);
      }
      if (update.error) throw update.error;

      const after = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (after.error) throw after.error;

      await logAuditEvent({
        userId: req.user?.id,
        storeId,
        action: "app.product.update",
        tableName: "products",
        recordId: productId,
        before: before.data,
        after: after.data || payload,
      });

      return res.json({ success: true, product: after.data || null });
    } catch (error: any) {
      logger.error("App product update failed", {
        error: error?.message,
        productId,
      });
      return res.status(500).json({ error: "Failed to update product" });
    }
  },
);

router.patch(
  "/variants/:id",
  requireStorePermission("products.manage"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const variantId = req.params.id;
    const hasPrice = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "price",
    );
    const hasCompareAtPrice = Object.prototype.hasOwnProperty.call(
      req.body || {},
      "compare_at_price",
    );

    let parsedPrice: number | null | undefined = undefined;
    if (hasPrice) {
      const raw = req.body?.price;
      if (raw === null || raw === "") {
        parsedPrice = null;
      } else {
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          return res
            .status(400)
            .json({ error: "price must be a valid number" });
        }
        parsedPrice = value;
      }
    }

    let parsedCompareAtPrice: number | null | undefined = undefined;
    if (hasCompareAtPrice) {
      const raw = req.body?.compare_at_price;
      if (raw === null || raw === "") {
        parsedCompareAtPrice = null;
      } else {
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          return res
            .status(400)
            .json({ error: "compare_at_price must be a valid number" });
        }
        parsedCompareAtPrice = value;
      }
    }

    const updates = {
      sku: req.body?.sku,
      barcode: req.body?.barcode,
      price: parsedPrice,
      compare_at_price: parsedCompareAtPrice,
      updated_at: nowIso(),
    };
    const payload = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    const updatedFieldCount = Object.keys(payload).filter(
      (key) => key !== "updated_at",
    ).length;

    if (updatedFieldCount === 0) {
      return res.status(400).json({ error: "No variant fields to update" });
    }

    try {
      let before = await supabase
        .from("variants")
        .select("*")
        .eq("id", variantId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (before.error && isSchemaCompatibilityError(before.error)) {
        before = await supabase
          .from("variants")
          .select("*")
          .eq("id", variantId)
          .eq("brand_id", storeId)
          .maybeSingle();
      }
      if (before.error) throw before.error;
      if (!before.data)
        return res.status(404).json({ error: "Variant not found" });

      const rowStoreId = String(
        (before.data as any).store_id || (before.data as any).brand_id || "",
      );
      if (!assertStoreScope(req, rowStoreId)) {
        return res
          .status(403)
          .json({ error: "Cross-store access is forbidden" });
      }

      const shopifyVariantId = String(
        (before.data as any).shopify_variant_id || "",
      ).trim();
      if (shopifyVariantId) {
        try {
          await syncVariantDetailsToShopify({
            storeId,
            shopifyVariantId,
            updates: {
              sku: req.body?.sku,
              barcode: req.body?.barcode,
              price: parsedPrice,
              compare_at_price: parsedCompareAtPrice,
            },
          });
        } catch (syncError: any) {
          logger.error("App variant update sync to Shopify failed", {
            variantId,
            storeId,
            shopifyVariantId,
            error: syncError?.message,
            details: syncError?.response?.data,
          });
          return res.status(502).json({
            error: "Failed to sync variant update to Shopify",
            code: "shopify_variant_update_failed",
          });
        }
      }

      let update = await supabase
        .from("variants")
        .update(payload)
        .eq("id", variantId)
        .eq("store_id", storeId);

      if (update.error && isSchemaCompatibilityError(update.error)) {
        const fallbackPayload = { ...payload } as Record<string, unknown>;
        delete fallbackPayload.compare_at_price;

        update = await supabase
          .from("variants")
          .update(fallbackPayload)
          .eq("id", variantId)
          .eq("brand_id", storeId);
      }

      if (update.error) throw update.error;

      const after = await supabase
        .from("variants")
        .select("*")
        .eq("id", variantId)
        .maybeSingle();
      if (after.error) throw after.error;

      await logAuditEvent({
        userId: req.user?.id,
        storeId,
        action: "app.variant.update",
        tableName: "variants",
        recordId: variantId,
        before: before.data,
        after: after.data || payload,
      });

      return res.json({ success: true, variant: after.data || null });
    } catch (error: any) {
      logger.error("App variant update failed", {
        error: error?.message,
        variantId,
      });
      return res.status(500).json({ error: "Failed to update variant" });
    }
  },
);

router.patch(
  "/variants/:id/stock",
  requireStorePermission("inventory.manage"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const variantId = req.params.id;
    const delta = Number(req.body?.delta);
    const reason = String(req.body?.reason || "").trim();
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "delta must be non-zero number" });
    }
    if (!reason) {
      return res.status(400).json({ error: "reason is required" });
    }

    try {
      const variant = await supabase
        .from("variants")
        .select("id, store_id, brand_id")
        .eq("id", variantId)
        .maybeSingle();
      if (variant.error) throw variant.error;
      if (!variant.data)
        return res.status(404).json({ error: "Variant not found" });

      const rowStoreId = String(
        (variant.data as any).store_id || (variant.data as any).brand_id || "",
      );
      if (!assertStoreScope(req, rowStoreId)) {
        return res
          .status(403)
          .json({ error: "Cross-store access is forbidden" });
      }

      await inventoryService.adjustStock(
        variantId,
        delta,
        reason,
        req.user!.id,
      );
      return res.json({ success: true });
    } catch (error: any) {
      logger.error("App variant stock update failed", {
        error: error?.message,
        variantId,
      });
      return res
        .status(500)
        .json({ error: error?.message || "Failed to update stock" });
    }
  },
);

router.get(
  "/variants/:id/movements",
  requireStorePermission("can_view_inventory"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const variantId = req.params.id;
    const limit = Math.min(500, Math.max(1, parseNumber(req.query.limit, 100)));

    try {
      const variant = await supabase
        .from("variants")
        .select("id, store_id, brand_id")
        .eq("id", variantId)
        .maybeSingle();
      if (variant.error) throw variant.error;
      if (!variant.data)
        return res.status(404).json({ error: "Variant not found" });

      const variantStoreId = String(
        (variant.data as any).store_id || (variant.data as any).brand_id || "",
      );
      if (!assertStoreScope(req, variantStoreId)) {
        return res
          .status(403)
          .json({ error: "Cross-store access is forbidden" });
      }

      const movements = await inventoryService.getStockMovements(
        variantId,
        limit,
      );
      return res.json({ movements: movements || [] });
    } catch (error: any) {
      logger.error("App variant movements failed", {
        error: error?.message,
        variantId,
      });
      return res.status(500).json({ error: "Failed to load stock movements" });
    }
  },
);

router.get(
  "/orders",
  requireStorePermission("can_view_orders"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    try {
      const page = Math.max(1, parseNumber(req.query.page, 1));
      const limit = Math.min(
        200,
        Math.max(1, parseNumber(req.query.limit, 50)),
      );
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const query: any = supabase
        .from("shopify_orders")
        .select("*", { count: "exact" })
        .eq("store_id", storeId)
        .order("created_at_shopify", { ascending: false, nullsFirst: false });

      let { data, error, count } = await query.range(from, to);
      if (error && isSchemaCompatibilityError(error)) {
        const fallback = await supabase
          .from("shopify_orders")
          .select("*", { count: "exact" })
          .eq("brand_id", storeId)
          .order("created_at_shopify", { ascending: false, nullsFirst: false })
          .range(from, to);
        data = fallback.data;
        error = fallback.error;
        count = fallback.count;
      }
      if (error) throw error;

      const safeOrders = !canViewFinance(req)
        ? (data || []).map((order: any) => {
            const clone = { ...order };
            delete clone.cost;
            delete clone.net_profit;
            delete clone.fees;
            return clone;
          })
        : data || [];

      return res.json({
        orders: safeOrders,
        pagination: { page, limit, total: count || 0 },
      });
    } catch (error: any) {
      logger.error("App orders list failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to load orders" });
    }
  },
);

router.get(
  "/orders/:id",
  requireStorePermission("can_view_orders"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const orderId = req.params.id;
    try {
      let orderResult = await supabase
        .from("shopify_orders")
        .select("*")
        .eq("id", orderId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (orderResult.error && isSchemaCompatibilityError(orderResult.error)) {
        orderResult = await supabase
          .from("shopify_orders")
          .select("*")
          .eq("id", orderId)
          .eq("brand_id", storeId)
          .maybeSingle();
      }
      if (orderResult.error) throw orderResult.error;
      if (!orderResult.data)
        return res.status(404).json({ error: "Order not found" });

      const order = { ...(orderResult.data as any) };
      if (!canViewFinance(req)) {
        delete order.cost;
        delete order.net_profit;
        delete order.fees;
      }

      return res.json({ order });
    } catch (error: any) {
      logger.error("App order details failed", {
        error: error?.message,
        orderId,
      });
      return res.status(500).json({ error: "Failed to load order details" });
    }
  },
);

router.get(
  "/customers",
  requireStorePermission("can_view_orders"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    try {
      const limit = Math.min(
        200,
        Math.max(1, parseNumber(req.query.limit, 50)),
      );
      let result = await supabase
        .from("shopify_customers")
        .select("*")
        .eq("store_id", storeId)
        .order("updated_at_shopify", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (result.error && isSchemaCompatibilityError(result.error)) {
        result = await supabase
          .from("shopify_customers")
          .select("*")
          .eq("brand_id", storeId)
          .order("updated_at_shopify", { ascending: false, nullsFirst: false })
          .limit(limit);
      }
      if (result.error) throw result.error;

      return res.json({ customers: result.data || [] });
    } catch (error: any) {
      logger.error("App customers list failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to load customers" });
    }
  },
);

router.get(
  "/reports",
  requireStorePermission("reports.view"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    try {
      let result = await supabase
        .from("reports")
        .select("*")
        .eq("store_id", storeId)
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (result.error && isSchemaCompatibilityError(result.error)) {
        result = await supabase
          .from("daily_reports")
          .select("*")
          .eq("brand_id", storeId)
          .order("report_date", { ascending: false })
          .order("created_at", { ascending: false });
      }
      if (result.error) throw result.error;

      return res.json({ reports: result.data || [] });
    } catch (error: any) {
      logger.error("App reports list failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to load reports" });
    }
  },
);

router.get(
  "/reports/status/today",
  requireStorePermission("reports.create"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const today = new Date().toISOString().slice(0, 10);
    try {
      let report = await supabase
        .from("reports")
        .select("id, report_date, body_text, created_at, updated_at")
        .eq("store_id", storeId)
        .eq("author_user_id", req.user!.id)
        .eq("report_date", today)
        .maybeSingle();

      if (report.error && isSchemaCompatibilityError(report.error)) {
        report = await supabase
          .from("daily_reports")
          .select(
            "id, report_date, done_today, blockers, plan_tomorrow, submitted_at, created_at, updated_at",
          )
          .eq("brand_id", storeId)
          .eq("user_id", req.user!.id)
          .eq("report_date", today)
          .maybeSingle();
      }

      if (report.error) throw report.error;
      return res.json({
        submitted: Boolean(report.data),
        report: report.data || null,
      });
    } catch (error: any) {
      logger.error("App report status failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to load report status" });
    }
  },
);

router.post(
  "/reports",
  requireStorePermission("reports.create"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const doneToday = String(req.body?.done_today || "").trim();
    const blockers = String(req.body?.blockers || "").trim();
    const planTomorrow = String(req.body?.plan_tomorrow || "").trim();
    const bodyText = String(req.body?.body_text || doneToday || "").trim();
    if (!bodyText) {
      return res
        .status(400)
        .json({ error: "body_text or done_today is required" });
    }

    const reportDate = String(
      req.body?.report_date || new Date().toISOString().slice(0, 10),
    );
    const status = String(req.body?.status || "submitted");
    const tags = Array.isArray(req.body?.tags)
      ? req.body.tags.filter((tag: any) => typeof tag === "string").slice(0, 20)
      : [];
    const composedBodyText =
      req.body?.body_text !== undefined
        ? bodyText
        : `Done: ${doneToday}\n\nBlockers: ${blockers || "None"}\n\nPlan: ${planTomorrow || "N/A"}`;

    try {
      let result = await supabase
        .from("reports")
        .insert({
          store_id: storeId,
          author_user_id: req.user!.id,
          report_date: reportDate,
          body_text: composedBodyText,
          status,
          tags,
        })
        .select("*")
        .single();

      if (result.error && isSchemaCompatibilityError(result.error)) {
        result = await supabase
          .from("daily_reports")
          .upsert(
            {
              user_id: req.user!.id,
              brand_id: storeId,
              report_date: reportDate,
              done_today: doneToday || bodyText,
              blockers: blockers || null,
              plan_tomorrow: planTomorrow,
            },
            { onConflict: "user_id,report_date" },
          )
          .select("*")
          .single();
      }

      if (result.error) throw result.error;

      await logAuditEvent({
        userId: req.user?.id,
        storeId,
        action: "app.report.create",
        tableName: "reports",
        recordId: result.data?.id || null,
        after: result.data,
      });

      return res.status(201).json({ report: result.data });
    } catch (error: any) {
      logger.error("App report create failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to create report" });
    }
  },
);

router.post(
  "/reports/:id/attachments/presign",
  requireStorePermission("reports.create"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const reportId = req.params.id;
    const fileName = sanitizeFileName(String(req.body?.file_name || ""));
    const mimeType = String(req.body?.mime_type || "application/octet-stream");
    const fileType = String(req.body?.file_type || "file");
    const size = Number(req.body?.size || 0);
    if (!fileName || size <= 0) {
      return res.status(400).json({ error: "file_name and size are required" });
    }
    if (!["image", "audio", "file"].includes(fileType)) {
      return res
        .status(400)
        .json({ error: "file_type must be image|audio|file" });
    }

    try {
      const report = await supabase
        .from("reports")
        .select("id")
        .eq("id", reportId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (report.error) {
        if (isSchemaCompatibilityError(report.error)) {
          return res.status(503).json({
            error:
              "Report attachments require migration 017_store_per_tenant_v2.sql",
          });
        }
        throw report.error;
      }
      if (!report.data)
        return res.status(404).json({ error: "Report not found" });

      const bucket = (
        process.env.REPORTS_STORAGE_BUCKET || "reports-media"
      ).trim();
      const storageKey = `${storeId}/${reportId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${fileName}`;

      const signed = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(storageKey);
      if (signed.error) throw signed.error;

      const attachment = await supabase.from("report_attachments").insert({
        store_id: storeId,
        report_id: reportId,
        file_type: fileType,
        mime_type: mimeType,
        size,
        storage_key: storageKey,
        uploaded_by: req.user!.id,
      });
      if (attachment.error) throw attachment.error;

      return res.json({
        bucket,
        storage_key: storageKey,
        token: signed.data?.token || null,
        signed_url: signed.data?.signedUrl || null,
      });
    } catch (error: any) {
      logger.error("App report attachment presign failed", {
        error: error?.message,
        reportId,
      });
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

router.post(
  "/reports/:id/comments",
  requireStorePermission("reports.view"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const reportId = req.params.id;
    const commentText = String(req.body?.comment_text || "").trim();
    if (!commentText) {
      return res.status(400).json({ error: "comment_text is required" });
    }

    try {
      const result = await supabase
        .from("report_comments")
        .insert({
          store_id: storeId,
          report_id: reportId,
          author_user_id: req.user!.id,
          comment_text: commentText,
        })
        .select("*")
        .single();
      if (result.error) throw result.error;

      return res.status(201).json({ comment: result.data });
    } catch (error: any) {
      logger.error("App report comment failed", {
        error: error?.message,
        reportId,
      });
      return res.status(500).json({ error: "Failed to create comment" });
    }
  },
);

router.get(
  "/users",
  requireStoreRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    try {
      const memberships = await supabase
        .from("store_memberships")
        .select("id, user_id, store_role, status, created_at, updated_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });
      if (memberships.error) throw memberships.error;

      const ids = (memberships.data || []).map((row: any) =>
        String(row.user_id),
      );
      let profilesMap = new Map<string, any>();
      if (ids.length > 0) {
        const profiles = await supabase
          .from("user_profiles")
          .select("id, full_name, is_active")
          .in("id", ids);
        if (profiles.error) throw profiles.error;
        profilesMap = new Map(
          (profiles.data || []).map((row: any) => [String(row.id), row]),
        );
      }

      const users = (memberships.data || []).map((membership: any) => ({
        membership_id: membership.id,
        user_id: membership.user_id,
        store_role: membership.store_role,
        membership_status: membership.status,
        full_name:
          profilesMap.get(String(membership.user_id))?.full_name || null,
        is_active:
          profilesMap.get(String(membership.user_id))?.is_active ?? true,
      }));
      return res.json({ users });
    } catch (error: any) {
      logger.error("App users list failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to load users" });
    }
  },
);

router.post(
  "/users",
  requireStoreRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "").trim();
    const fullName = String(req.body?.full_name || "").trim();
    const storeRole = String(req.body?.store_role || "staff");

    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ error: "email, password and full_name are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters" });
    }
    if (!["admin", "manager", "staff", "viewer"].includes(storeRole)) {
      return res.status(400).json({ error: "invalid store_role" });
    }

    try {
      const created = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (created.error || !created.data.user?.id) {
        throw created.error || new Error("Failed to create auth user");
      }

      const userId = created.data.user.id;
      const profile = await supabase.from("user_profiles").upsert(
        {
          id: userId,
          full_name: fullName,
          role: storeRole,
          store_id: storeId,
          is_active: true,
        },
        { onConflict: "id" },
      );
      if (profile.error) throw profile.error;

      const membership = await supabase
        .from("store_memberships")
        .insert({
          store_id: storeId,
          user_id: userId,
          store_role: storeRole,
          status: "active",
        })
        .select("*")
        .single();
      if (membership.error) throw membership.error;

      await logAuditEvent({
        userId: req.user?.id,
        storeId,
        action: "app.user.create",
        tableName: "store_memberships",
        recordId: membership.data?.id || null,
        after: membership.data,
        meta: { created_user_id: userId },
      });

      return res
        .status(201)
        .json({ success: true, user_id: userId, membership: membership.data });
    } catch (error: any) {
      logger.error("App create user failed", { error: error?.message });
      return res
        .status(500)
        .json({ error: error?.message || "Failed to create user" });
    }
  },
);

router.patch(
  "/users/:id/role",
  requireStoreRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const userId = req.params.id;
    const storeRole = String(req.body?.store_role || "").trim();
    if (!["admin", "manager", "staff", "viewer"].includes(storeRole)) {
      return res.status(400).json({ error: "invalid store_role" });
    }

    try {
      const before = await supabase
        .from("store_memberships")
        .select("*")
        .eq("store_id", storeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (before.error) throw before.error;
      if (!before.data)
        return res.status(404).json({ error: "User membership not found" });

      const after = await supabase
        .from("store_memberships")
        .update({ store_role: storeRole, updated_at: nowIso() })
        .eq("store_id", storeId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (after.error) throw after.error;

      await logAuditEvent({
        userId: req.user?.id,
        storeId,
        action: "app.user.update_role",
        tableName: "store_memberships",
        recordId: after.data?.id || null,
        before: before.data,
        after: after.data,
      });

      return res.json({ success: true, membership: after.data });
    } catch (error: any) {
      logger.error("App update user role failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to update user role" });
    }
  },
);

router.patch(
  "/users/:id/status",
  requireStoreRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const userId = req.params.id;
    const status = String(req.body?.status || "").trim();
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "status must be active|inactive" });
    }

    try {
      const after = await supabase
        .from("store_memberships")
        .update({ status, updated_at: nowIso() })
        .eq("store_id", storeId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (after.error) throw after.error;

      const profile = await supabase
        .from("user_profiles")
        .update({ is_active: status === "active" })
        .eq("id", userId);
      if (profile.error && !isSchemaCompatibilityError(profile.error)) {
        throw profile.error;
      }

      return res.json({ success: true, membership: after.data });
    } catch (error: any) {
      logger.error("App update user status failed", { error: error?.message });
      return res.status(500).json({ error: "Failed to update user status" });
    }
  },
);

router.get("/shopify/status", async (req: AuthRequest, res: Response) => {
  // Manual store check - allow without store to return "not connected"
  const storeId = resolveStoreId(req);
  if (!storeId) {
    return res.json({
      connected: false,
      status: "no_store",
      shop_domain: "",
      scopes: "",
      connected_at: null,
      message: "No store linked to your account",
    });
  }

  try {
    logger.info("Shopify status requested", {
      route: "/api/app/shopify/status",
      store_id: storeId,
    });
    const result = await supabase
      .from("shopify_connections")
      .select("store_id, shop_domain, scopes, status, connected_at, updated_at")
      .eq("store_id", storeId)
      .maybeSingle();
    if (result.error && isSchemaCompatibilityError(result.error)) {
      const fallback = await supabase
        .from("brands")
        .select(
          "id, shopify_domain, connected_at, shopify_scopes, is_active, is_configured",
        )
        .eq("id", storeId)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      return res.json({
        connected: Boolean(
          fallback.data?.connected_at || fallback.data?.is_configured,
        ),
        status: fallback.data?.is_active ? "connected" : "disconnected",
        shop_domain: fallback.data?.shopify_domain || "",
        scopes: fallback.data?.shopify_scopes || "",
        connected_at: fallback.data?.connected_at || null,
      });
    }
    if (result.error) throw result.error;

    let fallbackData: Record<string, any> | null = null;
    if (
      !result.data ||
      result.data.status !== "connected" ||
      !result.data.connected_at
    ) {
      const fallback = await supabase
        .from("brands")
        .select(
          "id, shopify_domain, connected_at, shopify_scopes, is_active, is_configured",
        )
        .eq("id", storeId)
        .maybeSingle();
      if (fallback.error && !isSchemaCompatibilityError(fallback.error)) {
        throw fallback.error;
      }
      fallbackData = (fallback.data as Record<string, any> | null) || null;
    }

    const connectedFromConnection = result.data?.status === "connected";
    const connectedFromFallback = Boolean(
      fallbackData?.connected_at || fallbackData?.is_configured,
    );
    const connected = connectedFromConnection || connectedFromFallback;
    const shopDomain =
      result.data?.shop_domain || fallbackData?.shopify_domain || "";
    const scopes = result.data?.scopes || fallbackData?.shopify_scopes || "";
    const connectedAt =
      result.data?.connected_at || fallbackData?.connected_at || null;
    const status = connected
      ? "connected"
      : result.data?.status ||
        (fallbackData?.is_active ? "connected" : "disconnected");

    // Heal stale connection rows when OAuth callback updated brands but not shopify_connections.
    if (!connectedFromConnection && connectedFromFallback && shopDomain) {
      const healUpdate = await supabase.from("shopify_connections").upsert(
        {
          store_id: storeId,
          shop_domain: shopDomain,
          scopes,
          connected_at: connectedAt || nowIso(),
          status: "connected",
          updated_at: nowIso(),
        },
        { onConflict: "store_id" },
      );
      if (healUpdate.error && !isSchemaCompatibilityError(healUpdate.error)) {
        logger.warn("Failed to heal stale shopify_connections status", {
          storeId,
          error: healUpdate.error.message,
        });
      }
    }

    logger.info("Shopify status resolved", {
      route: "/api/app/shopify/status",
      store_id: storeId,
      shop_domain: shopDomain,
      connected,
      status,
    });

    return res.json({
      connected,
      status,
      shop_domain: shopDomain,
      scopes,
      connected_at: connectedAt,
      updated_at: result.data?.updated_at || null,
    });
  } catch (error: any) {
    logger.error("App shopify status failed", {
      route: "/api/app/shopify/status",
      store_id: storeId,
      failure_code: error?.code || null,
      error: error?.message,
    });
    return res.status(500).json({ error: "Failed to load Shopify status" });
  }
});

router.post(
  "/shopify/disconnect",
  requireStorePermission("shopify.manage"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    try {
      await clearLegacyBrandConnection(storeId);

      const connectionUpdate = await supabase
        .from("shopify_connections")
        .update({
          access_token_encrypted: "",
          status: "disconnected",
          connected_at: null,
          updated_at: nowIso(),
        })
        .eq("store_id", storeId);
      if (
        connectionUpdate.error &&
        !isSchemaCompatibilityError(connectionUpdate.error)
      ) {
        throw connectionUpdate.error;
      }

      await logAuditEvent({
        userId: req.user?.id,
        storeId,
        action: "app.shopify.disconnect",
        tableName: "shopify_connections",
        recordId: null,
        after: { store_id: storeId, status: "disconnected" },
      });

      return res.json({ success: true });
    } catch (error: any) {
      logger.error("App shopify disconnect failed", { error: error?.message });
      return res
        .status(500)
        .json({ error: "Failed to disconnect Shopify store" });
    }
  },
);

router.post("/shopify/connect", async (req: AuthRequest, res: Response) => {
  // Manual store check instead of middleware
  const storeId = resolveStoreId(req);
  if (!storeId) {
    return res.status(400).json({
      error: "No store linked to your account. Please create a store first.",
      code: "store_required",
    });
  }

  // Check permission manually
  if (
    !req.user?.permissions?.["shopify.manage"] &&
    req.user?.storeRole !== "admin"
  ) {
    return res.status(403).json({
      error: "You don't have permission to manage Shopify connection",
      code: "permission_denied",
    });
  }

  const rawShop = String(req.body?.shop || req.body?.shop_domain || "").trim();
  const apiKey = String(req.body?.api_key || "").trim();
  const apiSecret = String(req.body?.api_secret || "").trim();

  if (!rawShop || !apiKey || !apiSecret) {
    return res
      .status(400)
      .json({ error: "shop, api_key and api_secret are required" });
  }

  const shopDomain = normalizeShopDomain(rawShop);
  if (!shopDomain.endsWith(".myshopify.com")) {
    return res.status(400).json({ error: "Invalid Shopify domain" });
  }

  try {
    logger.info("Shopify connect requested", {
      route: "/api/app/shopify/connect",
      store_id: storeId,
      shop_domain: shopDomain,
    });

    // Save credentials to brands table
    await upsertLegacyBrandForStore({
      storeId,
      shopDomain,
      apiKey,
      apiSecret,
    });

    // Create OAuth state
    const state = crypto.randomBytes(32).toString("hex");
    const scopes =
      "read_products,write_products,read_inventory,write_inventory,read_orders,read_customers,read_locations";

    const stateInsert = await supabase.from("shopify_oauth_states").insert({
      state,
      shop: shopDomain,
      brand_id: storeId,
      user_id: req.user?.id || null,
      api_key: apiKey,
      api_secret: apiSecret,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      created_at: nowIso(),
    });

    if (stateInsert.error) {
      logger.warn(
        "Failed to create OAuth state in app route, trying compatibility install-url route",
        {
          route: "/api/app/shopify/connect",
          store_id: storeId,
          shop_domain: shopDomain,
          error: stateInsert.error.message,
        },
      );

      try {
        const baseUrl = resolveBackendUrl(req);
        const legacyResponse = await axios.post(
          `${baseUrl}/api/shopify/get-install-url`,
          {
            shop: shopDomain,
            api_key: apiKey,
            api_secret: apiSecret,
            brand_id: storeId,
          },
          {
            headers: {
              Authorization: String(req.headers.authorization || ""),
              "Content-Type": "application/json",
            },
            timeout: 15000,
          },
        );

        const installUrl = String(legacyResponse.data?.installUrl || "");
        if (installUrl) {
          return res.status(201).json({
            install_url: installUrl,
            state: legacyResponse.data?.state || state,
            shop: shopDomain,
            fallback: "legacy_get_install_url",
          });
        }
      } catch (legacyError: any) {
        logger.error("Compatibility install-url fallback failed", {
          route: "/api/app/shopify/connect",
          store_id: storeId,
          shop_domain: shopDomain,
          failure_code: legacyError?.code || null,
          error: legacyError?.message,
        });
      }

      throw new Error(
        `Failed to create OAuth state: ${stateInsert.error.message}`,
      );
    }

    // Update shopify_connections
    await supabase.from("shopify_connections").upsert(
      {
        store_id: storeId,
        shop_domain: shopDomain,
        access_token_encrypted: "",
        scopes,
        status: "disconnected",
        updated_at: nowIso(),
      },
      { onConflict: "store_id" },
    );

    // Build install URL
    const backendUrl = resolveBackendUrl(req);
    const redirectUri = `${backendUrl}/api/shopify/callback`;
    const installUrl =
      `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${encodeURIComponent(apiKey)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${encodeURIComponent(state)}`;

    logger.info("Shopify OAuth flow started", {
      route: "/api/app/shopify/connect",
      store_id: storeId,
      shop_domain: shopDomain,
      state,
    });

    return res.status(201).json({
      install_url: installUrl,
      state,
      shop: shopDomain,
    });
  } catch (error: any) {
    const failureCode = String(error?.code || "shopify_connect_failed");
    logger.error("App shopify connect failed", {
      error: error?.message,
      failure_code: failureCode,
      details: error?.details,
      hint: error?.hint,
      store_id: storeId,
      shop_domain: shopDomain,
    });

    // Handle duplicate key error (brand already exists)
    if (error?.code === "23505") {
      return res.status(409).json({
        error:
          "This Shopify store is already connected. Please disconnect first or use a different store.",
        code: "duplicate_shop_domain",
        details: error?.details,
      });
    }

    // Handle other database errors
    if (error?.code && error?.code.startsWith("23")) {
      return res.status(500).json({
        error: "Database error occurred. Please try again or contact support.",
        code: error?.code,
      });
    }

    // Handle schema compatibility errors
    if (isSchemaCompatibilityError(error)) {
      return res.status(500).json({
        error: "Database schema is not compatible. Please run migration 019.",
        code: "schema_incompatible",
      });
    }

    // Generic error
    return res.status(500).json({
      error: error?.message || "Failed to start Shopify OAuth flow",
      code: "shopify_connect_failed",
    });
  }
});

router.post(
  "/shopify/sync/full",
  requireStorePermission("shopify.manage"),
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const wipeExistingData = req.body?.wipe_existing_data !== false;
    try {
      const runInsert = await supabase
        .from("shopify_sync_runs")
        .insert({
          store_id: storeId,
          run_type: "full_import",
          started_at: nowIso(),
          summary_json: {
            status: "running",
            requested_by: req.user?.id || null,
          },
        })
        .select("id")
        .maybeSingle();
      const runId = runInsert.data?.id || null;

      const summary = await shopifySyncService.syncBrand(storeId, {
        wipeExistingData,
      });

      if (runId) {
        const runUpdate = await supabase
          .from("shopify_sync_runs")
          .update({
            finished_at: nowIso(),
            summary_json: { status: "succeeded", ...summary },
          })
          .eq("id", runId);
        if (runUpdate.error && !isSchemaCompatibilityError(runUpdate.error)) {
          logger.warn("Failed to update sync run", {
            error: runUpdate.error.message,
          });
        }
      }

      return res.json({ success: true, summary });
    } catch (error: any) {
      logger.error("App shopify sync failed", {
        error: error?.message,
        storeId,
      });
      return res
        .status(500)
        .json({ error: error?.message || "Failed to run full sync" });
    }
  },
);

router.get("/notifications", async (req: AuthRequest, res: Response) => {
  const storeId = ensureStoreId(req, res);
  if (!storeId) return;

  const unreadOnly = String(req.query.unread_only || "false") === "true";
  const limit = Math.min(200, Math.max(1, parseNumber(req.query.limit, 50)));
  try {
    let query: any = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user!.id)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (unreadOnly) query = query.eq("is_read", false);

    let result = await query;
    if (result.error && isSchemaCompatibilityError(result.error)) {
      let fallback: any = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", req.user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (unreadOnly) fallback = fallback.eq("read", false);
      result = await fallback;
    }
    if (result.error) throw result.error;

    return res.json({ notifications: result.data || [] });
  } catch (error: any) {
    logger.error("App notifications failed", { error: error?.message });
    return res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.get(
  "/notifications/unread-count",
  async (req: AuthRequest, res: Response) => {
    // Allow without store - return 0
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.json({ unread_count: 0 });
    }

    try {
      let result = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.user!.id)
        .eq("store_id", storeId)
        .eq("is_read", false);
      if (result.error && isSchemaCompatibilityError(result.error)) {
        result = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", req.user!.id)
          .eq("read", false);
      }
      if (result.error) throw result.error;
      return res.json({ unread_count: result.count || 0 });
    } catch (error: any) {
      logger.error("App notifications unread count failed", {
        error: error?.message,
      });
      return res.status(500).json({ error: "Failed to load unread count" });
    }
  },
);

router.patch(
  "/notifications/:id/read",
  async (req: AuthRequest, res: Response) => {
    const storeId = ensureStoreId(req, res);
    if (!storeId) return;

    const notificationId = req.params.id;
    try {
      let result = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("store_id", storeId)
        .eq("user_id", req.user!.id);
      if (result.error && isSchemaCompatibilityError(result.error)) {
        result = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId)
          .eq("user_id", req.user!.id);
      }
      if (result.error) throw result.error;
      return res.json({ success: true });
    } catch (error: any) {
      logger.error("App notification read failed", {
        error: error?.message,
        notificationId,
      });
      return res
        .status(500)
        .json({ error: "Failed to mark notification as read" });
    }
  },
);

export default router;
