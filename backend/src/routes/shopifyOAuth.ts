import { Router, Request, Response } from "express";
import crypto from "crypto";
import axios from "axios";
import { supabase } from "../config/supabase";
import { authenticate, AuthRequest } from "../middleware/auth";
import { logger } from "../utils/logger";
import { logAuditEvent } from "../utils/auditLogger";

const router = Router();

const SHOPIFY_API_VERSION = "2024-01";
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;
const SHOPIFY_HTTP_TIMEOUT_MS = Number(process.env.SHOPIFY_HTTP_TIMEOUT_MS || "15000");

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveBackendBaseUrl(): string {
  const explicit = (process.env.BACKEND_URL || process.env.API_URL || "").trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }
  const port = (process.env.PORT || "3002").trim();
  return `http://localhost:${port}`;
}

function resolveFrontendUrl(): string {
  const explicit = (process.env.FRONTEND_URL || "").trim();
  return explicit ? trimTrailingSlash(explicit) : "http://localhost:5173";
}

const BACKEND_BASE_URL = resolveBackendBaseUrl();
const FRONTEND_URL = resolveFrontendUrl();
const REDIRECT_URI =
  (process.env.SHOPIFY_REDIRECT_URI || "").trim() || `${BACKEND_BASE_URL}/api/shopify/callback`;

const SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_orders",
  "read_locations",
].join(",");

const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "products/create",
  "products/update",
  "inventory_levels/update",
];

const inMemoryOAuthStates = new Map<string, OAuthStateRecord>();

type OAuthStateRecord = {
  state: string;
  shop: string;
  brand_id?: string | null;
  user_id?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeShopDomain(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, "");
  if (!normalized.endsWith(".myshopify.com")) {
    return `${normalized}.myshopify.com`;
  }
  return normalized;
}

function isLikelyShopifyAccessToken(value: string): boolean {
  const candidate = value.trim().toLowerCase();
  return candidate.startsWith("shpat_") || candidate.startsWith("shpca_");
}

function assertOAuthSecretInput(value: string): void {
  if (!isLikelyShopifyAccessToken(value)) {
    return;
  }

  throw new HttpError(
    400,
    "invalid_client_secret",
    "api_secret must be Shopify App API Secret Key, not Admin API access token",
  );
}

function buildBrandNameFromShop(shopDomain: string): string {
  const base = shopDomain
    .replace(".myshopify.com", "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return (base || "shopify_store").slice(0, 80);
}

function buildOAuthUrl(shopDomain: string, clientId: string, state: string): string {
  return (
    `https://${shopDomain}/admin/oauth/authorize?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${encodeURIComponent(state)}`
  );
}

function cleanQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(",");
  }
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function buildCanonicalQuery(query: Request["query"]): string {
  return Object.keys(query)
    .filter((key) => key !== "hmac" && key !== "signature")
    .sort()
    .map((key) => `${key}=${cleanQueryValue((query as Record<string, unknown>)[key])}`)
    .join("&");
}

function verifyCallbackHmac(query: Request["query"], secret: string, receivedHmac: string): boolean {
  if (!secret || !receivedHmac) {
    return false;
  }

  const canonicalQuery = buildCanonicalQuery(query);
  const generated = crypto
    .createHmac("sha256", secret)
    .update(canonicalQuery)
    .digest("hex");

  const generatedBuffer = Buffer.from(generated, "utf8");
  const receivedBuffer = Buffer.from(receivedHmac, "utf8");
  if (generatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
}

function isSchemaMismatchError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("null value") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship")
  );
}

function isSupabaseAccessError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("jwt") ||
    text.includes("auth") ||
    text.includes("permission denied") ||
    text.includes("row-level security") ||
    text.includes("not authenticated") ||
    text.includes("invalid api key") ||
    text.includes("service_role")
  );
}

function isStateExpired(stateRow: OAuthStateRecord): boolean {
  if (stateRow.expires_at) {
    return Date.now() > new Date(stateRow.expires_at).getTime();
  }
  if (stateRow.created_at) {
    return Date.now() - new Date(stateRow.created_at).getTime() > OAUTH_STATE_TTL_MS;
  }
  return false;
}

async function persistOAuthState(params: {
  state: string;
  shop: string;
  brandId?: string;
  userId?: string;
  apiKey: string;
  apiSecret: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  const payloads: Record<string, unknown>[] = [
    {
      state: params.state,
      shop: params.shop,
      brand_id: params.brandId || null,
      user_id: params.userId || null,
      api_key: params.apiKey,
      api_secret: params.apiSecret,
      expires_at: expiresAt,
    },
    {
      state: params.state,
      shop: params.shop,
      brand_id: params.brandId || null,
      user_id: params.userId || null,
      api_key: params.apiKey,
      api_secret: params.apiSecret,
    },
    {
      state: params.state,
      shop: params.shop,
      user_id: params.userId || null,
      api_key: params.apiKey,
      api_secret: params.apiSecret,
    },
    {
      state: params.state,
      shop: params.shop,
      api_key: params.apiKey,
      api_secret: params.apiSecret,
    },
    {
      state: params.state,
      shop: params.shop,
    },
  ];

  let lastError: any = null;
  for (const payload of payloads) {
    const { error } = await supabase.from("shopify_oauth_states").insert(payload);
    if (!error) {
      return;
    }
    lastError = error;
    if (!isSchemaMismatchError(error)) {
      break;
    }
  }

  if (isSchemaMismatchError(lastError)) {
    inMemoryOAuthStates.set(params.state, {
      state: params.state,
      shop: params.shop,
      brand_id: params.brandId || null,
      user_id: params.userId || null,
      api_key: params.apiKey,
      api_secret: params.apiSecret,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
    logger.warn("Using in-memory OAuth state fallback", {
      reason: lastError?.message,
      state: params.state,
      shop: params.shop,
    });
    return;
  }

  throw lastError || new Error("Failed to persist OAuth state");
}

async function findBrandById(brandId: string) {
  const { data, error } = await supabase.from("brands").select("*").eq("id", brandId).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

async function findBrandByOptionalColumn(column: string, value: string) {
  if (!value) {
    return null;
  }

  const { data, error } = await supabase.from("brands").select("*").eq(column, value).maybeSingle();
  if (error) {
    if (isSchemaMismatchError(error)) {
      logger.warn("Skipping optional brand lookup because schema is missing expected column", {
        column,
        error: error.message,
      });
      return null;
    }
    throw error;
  }
  return data;
}

async function resolveOrCreateBrandForInstall(shopDomain: string): Promise<Record<string, unknown>> {
  const { data: byShop, error: byShopError } = await supabase
    .from("brands")
    .select("*")
    .eq("shopify_domain", shopDomain)
    .maybeSingle();
  if (byShopError) {
    throw byShopError;
  }
  if (byShop) {
    return byShop as Record<string, unknown>;
  }

  const baseName = buildBrandNameFromShop(shopDomain);
  const { data: existingNames, error: existingNamesError } = await supabase
    .from("brands")
    .select("name")
    .ilike("name", `${baseName}%`);
  if (existingNamesError) {
    throw existingNamesError;
  }

  const usedNames = new Set(
    (existingNames || [])
      .map((row: any) => String(row?.name || "").toLowerCase())
      .filter(Boolean),
  );

  let candidate = baseName;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixPart = `_${suffix}`;
    const maxBaseLen = Math.max(1, 100 - suffixPart.length);
    candidate = `${baseName.slice(0, maxBaseLen)}${suffixPart}`;
    suffix += 1;
  }

  const { data: createdBrand, error: createError } = await supabase
    .from("brands")
    .insert({
      name: candidate,
      shopify_domain: shopDomain,
      // Keep non-null compatibility with earlier schema versions.
      shopify_location_id: "pending",
    })
    .select("*")
    .maybeSingle();

  if (createError) {
    const { data: raceBrand, error: raceError } = await supabase
      .from("brands")
      .select("*")
      .eq("shopify_domain", shopDomain)
      .maybeSingle();
    if (raceError) {
      throw raceError;
    }
    if (raceBrand) {
      return raceBrand as Record<string, unknown>;
    }
    throw createError;
  }

  if (!createdBrand) {
    throw new Error("Failed to create brand for Shopify connection");
  }

  return createdBrand as Record<string, unknown>;
}

function getBrandField<T = unknown>(brand: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(brand, key)) {
      return brand[key] as T;
    }
  }
  return undefined;
}

function setIfPresent(
  target: Record<string, unknown>,
  brand: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (Object.prototype.hasOwnProperty.call(brand, key)) {
    target[key] = value;
  }
}

async function resolveBrandForOAuth(stateRow: OAuthStateRecord, shopDomain: string) {
  if (stateRow.brand_id) {
    const byId = await findBrandById(stateRow.brand_id);
    if (byId) {
      return byId;
    }
  }

  const { data: byShop, error: byShopError } = await supabase
    .from("brands")
    .select("*")
    .eq("shopify_domain", shopDomain)
    .maybeSingle();
  if (byShopError) {
    throw byShopError;
  }
  if (byShop) {
    return byShop;
  }

  if (stateRow.api_key) {
    const byApiKey = await findBrandByOptionalColumn("api_key", stateRow.api_key);
    if (byApiKey) {
      return byApiKey;
    }

    const byShopifyApiKey = await findBrandByOptionalColumn("shopify_api_key", stateRow.api_key);
    if (byShopifyApiKey) {
      return byShopifyApiKey;
    }
  }

  throw new HttpError(404, "brand_not_found", "Brand not found for OAuth state");
}

async function updateBrandConnection(params: {
  brand: Record<string, unknown>;
  shopDomain: string;
  apiKey: string;
  accessToken: string;
  scope?: string;
  locationId?: string;
}) {
  const { brand, shopDomain, apiKey, accessToken, scope, locationId } = params;
  const updates: Record<string, unknown> = {
    shopify_domain: shopDomain,
    connected_at: new Date().toISOString(),
  };

  setIfPresent(updates, brand, "shopify_access_token", accessToken);
  setIfPresent(updates, brand, "access_token", accessToken);
  setIfPresent(updates, brand, "shopify_api_key", apiKey);
  setIfPresent(updates, brand, "api_key", apiKey);
  setIfPresent(updates, brand, "shopify_scopes", scope || null);
  setIfPresent(updates, brand, "shopify_location_id", locationId || null);
  setIfPresent(updates, brand, "is_configured", true);
  setIfPresent(updates, brand, "is_active", true);
  setIfPresent(updates, brand, "sync_status", "idle");
  setIfPresent(updates, brand, "last_sync_error", null);

  const { error } = await supabase.from("brands").update(updates).eq("id", brand.id);
  if (error) {
    throw error;
  }
}

async function clearBrandConnection(brand: Record<string, unknown>) {
  const updates: Record<string, unknown> = {
    connected_at: null,
  };
  setIfPresent(updates, brand, "shopify_access_token", null);
  setIfPresent(updates, brand, "access_token", null);
  setIfPresent(updates, brand, "shopify_scopes", null);
  setIfPresent(updates, brand, "shopify_location_id", null);
  setIfPresent(updates, brand, "is_configured", false);
  setIfPresent(updates, brand, "is_active", false);

  const { error } = await supabase.from("brands").update(updates).eq("id", brand.id);
  if (error) {
    throw error;
  }
}

function getPublicBrandConnection(brand: Record<string, unknown>) {
  const token = getBrandField<string | null>(brand, ["shopify_access_token", "access_token"]);
  const connectedAt = getBrandField<string | null>(brand, ["connected_at"]);
  const scopes = getBrandField<string | null>(brand, ["shopify_scopes"]);
  const isConfigured = getBrandField<boolean | null>(brand, ["is_configured", "is_active"]);
  const connected = Boolean(connectedAt || token);

  return {
    connected,
    shop: getBrandField<string | null>(brand, ["shopify_domain"]) || "",
    connected_at: connectedAt || null,
    is_active: isConfigured ?? connected,
    scopes: scopes ? scopes.split(",").map((item) => item.trim()).filter(Boolean) : [],
    last_sync_at: getBrandField<string | null>(brand, ["last_sync_at"]) || null,
  };
}

async function exchangeCodeForAccessToken(params: {
  shopDomain: string;
  apiKey: string;
  apiSecret: string;
  authCode: string;
}) {
  const tokenUrl = `https://${params.shopDomain}/admin/oauth/access_token`;
  let tokenResponse: any;
  try {
    tokenResponse = await axios.post(
      tokenUrl,
      {
        client_id: params.apiKey,
        client_secret: params.apiSecret,
        code: params.authCode,
      },
      {
        timeout: SHOPIFY_HTTP_TIMEOUT_MS,
      },
    );
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      throw new HttpError(504, "shopify_timeout", "Shopify API timeout during token exchange");
    }

    if (error?.response?.data) {
      const details =
        error.response.data?.error_description ||
        error.response.data?.error ||
        error.response.data?.errors ||
        error.response.statusText;
      throw new HttpError(
        400,
        "token_exchange_failed",
        `Shopify token exchange failed: ${details || "invalid credentials"}`,
      );
    }

    throw error;
  }

  const accessToken = tokenResponse.data?.access_token as string | undefined;
  if (!accessToken) {
    throw new HttpError(500, "token_missing", "No Shopify access token returned");
  }

  return {
    accessToken,
    scope: tokenResponse.data?.scope as string | undefined,
  };
}

async function fetchPrimaryLocationId(shopDomain: string, accessToken: string): Promise<string> {
  try {
    const locationsResponse = await axios.get(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/locations.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
        timeout: SHOPIFY_HTTP_TIMEOUT_MS,
      },
    );
    return locationsResponse.data?.locations?.[0]?.id?.toString() || "";
  } catch (error: any) {
    logger.warn("Unable to load Shopify locations, continuing without location", {
      shopDomain,
      error: error.message,
    });
    return "";
  }
}

async function consumeOAuthState(stateToken: string): Promise<OAuthStateRecord> {
  const { data, error } = await supabase
    .from("shopify_oauth_states")
    .select("*")
    .eq("state", stateToken)
    .maybeSingle();

  if (error && !isSchemaMismatchError(error)) {
    throw error;
  }
  if (!data) {
    const fallback = inMemoryOAuthStates.get(stateToken);
    if (fallback) {
      return fallback;
    }

    if (error && isSchemaMismatchError(error)) {
      throw new HttpError(
        503,
        "oauth_state_storage_unavailable",
        "OAuth state storage is not ready. Apply database migrations and retry.",
      );
    }

    throw new HttpError(400, "invalid_state", "Invalid OAuth state");
  }

  return data as OAuthStateRecord;
}

async function deleteOAuthState(stateToken: string) {
  inMemoryOAuthStates.delete(stateToken);
  const { error } = await supabase.from("shopify_oauth_states").delete().eq("state", stateToken);
  if (error && !isSchemaMismatchError(error)) {
    logger.warn("Failed to delete OAuth state row", { stateToken, error: error.message });
  }
}

async function completeOAuthCallback(params: {
  code: string;
  shop: string;
  state: string;
  query?: Request["query"];
  hmac?: string;
}) {
  const shopDomain = normalizeShopDomain(params.shop);
  const oauthState = await consumeOAuthState(params.state);

  if (normalizeShopDomain(oauthState.shop) !== shopDomain) {
    throw new HttpError(400, "invalid_state", "OAuth state does not match shop");
  }
  if (isStateExpired(oauthState)) {
    await deleteOAuthState(params.state);
    throw new HttpError(400, "state_expired", "OAuth state expired");
  }

  let brand: any = null;
  let apiKey = (oauthState.api_key || "").toString().trim();
  let apiSecret = (oauthState.api_secret || "").toString().trim();

  if (!apiKey || !apiSecret) {
    brand = await resolveBrandForOAuth(oauthState, shopDomain);
    apiKey = (brand.api_key || brand.shopify_api_key || "").toString().trim();
    apiSecret = (brand.api_secret || brand.webhook_secret || "").toString().trim();
  }

  if (!apiKey || !apiSecret) {
    throw new HttpError(
      400,
      "missing_credentials",
      "OAuth credentials are not configured for this brand",
    );
  }
  assertOAuthSecretInput(apiSecret);

  if (params.hmac && params.query) {
    const isValid = verifyCallbackHmac(params.query, apiSecret, params.hmac);
    if (!isValid) {
      throw new HttpError(400, "hmac_error", "Shopify callback HMAC verification failed");
    }
  }

  const { accessToken, scope } = await exchangeCodeForAccessToken({
    shopDomain,
    apiKey,
    apiSecret,
    authCode: params.code,
  });

  const locationId = await fetchPrimaryLocationId(shopDomain, accessToken);
  if (!brand) {
    brand = await resolveBrandForOAuth(oauthState, shopDomain);
  }
  const beforeConnectionState = getPublicBrandConnection(brand as Record<string, unknown>);

  await updateBrandConnection({
    brand: brand as Record<string, unknown>,
    shopDomain,
    apiKey,
    accessToken,
    scope,
    locationId,
  });

  const refreshedBrand = await findBrandById(String((brand as Record<string, unknown>).id));
  if (refreshedBrand) {
    await logAuditEvent({
      userId: oauthState.user_id || null,
      action: "shopify.oauth.connected",
      tableName: "brands",
      recordId: String(refreshedBrand.id),
      before: beforeConnectionState,
      after: getPublicBrandConnection(refreshedBrand as Record<string, unknown>),
      meta: {
        shop: shopDomain,
      },
    });
  }

  await deleteOAuthState(params.state);

  logger.info("Shopify OAuth completed", {
    brandId: brand.id,
    shopDomain,
  });

  return {
    brandId: brand.id as string,
    brandName: (brand.name as string) || "",
    shopDomain,
  };
}

/**
 * GET /api/shopify/auth?shop=store.myshopify.com&brand_id=xxx
 * Step 1: Build install URL and redirect merchant to Shopify
 */
router.get("/auth", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rawShop = String(req.query.shop || "");
    const brandId = String(req.query.brand_id || "");
    if (!rawShop || !brandId) {
      throw new HttpError(400, "bad_request", "Missing shop or brand_id");
    }

    const shopDomain = normalizeShopDomain(rawShop);
    if (!shopDomain.endsWith(".myshopify.com")) {
      throw new HttpError(400, "bad_shop", "Invalid Shopify domain");
    }

    const brand = await findBrandById(brandId);
    if (!brand) {
      throw new HttpError(404, "brand_not_found", "Brand not found");
    }

    const apiKey = (brand.api_key || brand.shopify_api_key || "").toString().trim();
    const apiSecret = (brand.api_secret || brand.webhook_secret || "")
      .toString()
      .trim();

    if (!apiKey || !apiSecret) {
      throw new HttpError(
        400,
        "missing_credentials",
        "Brand is missing api_key/api_secret for OAuth",
      );
    }
    assertOAuthSecretInput(apiSecret);

    const state = crypto.randomBytes(32).toString("hex");
    await persistOAuthState({
      state,
      shop: shopDomain,
      brandId,
      userId: req.user?.id,
      apiKey,
      apiSecret,
    });

    const installUrl = buildOAuthUrl(shopDomain, apiKey, state);
    logger.info("Initiating Shopify OAuth", { brandId, shopDomain });

    const wantsJson =
      String(req.query.response || "").toLowerCase() === "json" ||
      req.get("accept")?.includes("application/json");

    if (wantsJson) {
      return res.json({
        installUrl,
        state,
        shop: shopDomain,
        brand_id: brandId,
      });
    }

    res.redirect(installUrl);
  } catch (error: any) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "Failed to initiate OAuth";
    logger.error("Shopify OAuth initiation failed", { error: error.message });
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/shopify/get-install-url
 * Compatibility endpoint for settings modal flow.
 */
router.post("/get-install-url", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rawShop = String(req.body?.shop || "");
    const apiKey = String(req.body?.api_key || "").trim();
    const apiSecret = String(req.body?.api_secret || "").trim();
    const brandId = req.body?.brand_id ? String(req.body.brand_id) : "";

    if (!rawShop || !apiKey || !apiSecret) {
      throw new HttpError(400, "bad_request", "shop, api_key and api_secret are required");
    }
    assertOAuthSecretInput(apiSecret);

    const shopDomain = normalizeShopDomain(rawShop);
    if (!shopDomain.endsWith(".myshopify.com")) {
      throw new HttpError(400, "bad_shop", "Invalid Shopify domain");
    }

    let brand: any = null;
    if (brandId) {
      brand = await findBrandById(brandId);
      if (!brand) {
        throw new HttpError(404, "brand_not_found", "Brand not found");
      }
    } else {
      const { data: byShop, error: byShopError } = await supabase
        .from("brands")
        .select("*")
        .eq("shopify_domain", shopDomain)
        .maybeSingle();
      if (byShopError) {
        throw byShopError;
      }
      brand = byShop;

      if (!brand) {
        const byApiKey = await findBrandByOptionalColumn("api_key", apiKey);
        brand = byApiKey;
      }

      if (!brand) {
        const byShopifyApiKey = await findBrandByOptionalColumn("shopify_api_key", apiKey);
        brand = byShopifyApiKey;
      }

      if (!brand) {
        // New merchant flow: create brand on the fly from shop domain.
        brand = await resolveOrCreateBrandForInstall(shopDomain);
      }
    }

    const credentialUpdates: Record<string, unknown> = {
      shopify_domain: shopDomain,
      updated_at: new Date().toISOString(),
    };
    setIfPresent(credentialUpdates, brand, "api_key", apiKey);
    setIfPresent(credentialUpdates, brand, "api_secret", apiSecret);
    setIfPresent(credentialUpdates, brand, "shopify_api_key", apiKey);

    const { error: updateError } = await supabase
      .from("brands")
      .update(credentialUpdates)
      .eq("id", brand.id);
    if (updateError) {
      throw updateError;
    }

    const state = crypto.randomBytes(32).toString("hex");
    await persistOAuthState({
      state,
      shop: shopDomain,
      brandId: brand.id,
      userId: req.user?.id,
      apiKey,
      apiSecret,
    });

    res.json({
      installUrl: buildOAuthUrl(shopDomain, apiKey, state),
      state,
      brandId: brand.id,
    });
  } catch (error: any) {
    const schemaMismatch = isSchemaMismatchError(error);
    const supabaseAccessError = isSupabaseAccessError(error);
    const status =
      error instanceof HttpError ? error.status : schemaMismatch || supabaseAccessError ? 503 : 500;
    const message =
      error instanceof HttpError
        ? error.message
        : schemaMismatch
          ? "Database schema is missing required Shopify OAuth tables/columns. Run latest migrations."
          : supabaseAccessError
            ? "Backend cannot access Supabase. Verify SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY in Railway."
          : "Failed to generate install URL";
    logger.error("get-install-url failed", {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/shopify/callback
 * Callback handler used by frontend callback page.
 */
router.post("/callback", async (req: Request, res: Response) => {
  try {
    const code = String(req.body?.code || "");
    const shop = String(req.body?.shop || "");
    const state = String(req.body?.state || "");
    if (!code || !shop || !state) {
      throw new HttpError(400, "bad_request", "Missing code, shop or state");
    }

    const result = await completeOAuthCallback({ code, shop, state });
    res.json({
      success: true,
      message: "Shopify connected successfully",
      brand_id: result.brandId,
      shop: result.shopDomain,
    });
  } catch (error: any) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "OAuth callback failed";
    logger.error("POST callback failed", { error: error.message });
    res.status(status).json({ error: message });
  }
});

/**
 * GET /api/shopify/callback
 * Callback handler used directly by Shopify when redirect URI points to backend.
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const callbackError = String(req.query.error || "");
    const code = String(req.query.code || "");
    const shop = String(req.query.shop || "");
    const state = String(req.query.state || "");
    const hmac = String(req.query.hmac || "");

    if (callbackError) {
      if (state) {
        await deleteOAuthState(state);
      }
      return res.redirect(`${FRONTEND_URL}/settings?oauth=declined`);
    }

    if (!code || !shop || !state) {
      throw new HttpError(400, "bad_request", "Missing code, shop or state");
    }

    const result = await completeOAuthCallback({
      code,
      shop,
      state,
      query: req.query,
      hmac,
    });

    const brandName = result.brandName || result.shopDomain;
    res.redirect(
      `${FRONTEND_URL}/settings?oauth=success&brand=${encodeURIComponent(brandName)}`,
    );
  } catch (error: any) {
    const errorCode = error instanceof HttpError ? error.code : "oauth_failed";
    logger.error("GET callback failed", { error: error.message, code: errorCode });
    res.redirect(
      `${FRONTEND_URL}/settings?oauth=error&msg=${encodeURIComponent(errorCode)}`,
    );
  }
});

/**
 * GET /api/shopify/brands
 * Lightweight brand list for settings pages.
 */
router.get("/brands", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase.from("brands").select("*").order("name");
    if (error) {
      throw error;
    }

    const brands = (data || []).map((brand: Record<string, unknown>) => {
      const status = getPublicBrandConnection(brand);
      return {
        id: brand.id,
        name: brand.name,
        shopify_domain: brand.shopify_domain,
        shopify_location_id: brand.shopify_location_id || null,
        shopify_scopes: (brand.shopify_scopes as string) || "",
        connected_at: status.connected_at,
        last_sync_at: brand.last_sync_at || null,
        is_active: status.is_active,
        is_configured: Boolean(brand.is_configured ?? status.connected),
      };
    });

    res.json({ brands });
  } catch (error: any) {
    logger.error("Failed to fetch brands for shopify settings", { error: error.message });
    res.status(500).json({ error: "Failed to fetch brands" });
  }
});

/**
 * POST /api/shopify/setup-webhooks/:brandId
 * Register required Shopify webhooks for this brand.
 */
router.post(
  "/setup-webhooks/:brandId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { brandId } = req.params;
      const brand = await findBrandById(brandId);
      if (!brand) {
        throw new HttpError(404, "brand_not_found", "Brand not found");
      }

      const accessToken = (brand.shopify_access_token || brand.access_token || "").toString();
      if (!accessToken) {
        throw new HttpError(400, "not_connected", "Brand is not connected to Shopify");
      }

      const shopDomain = normalizeShopDomain(String(brand.shopify_domain || ""));
      if (!shopDomain) {
        throw new HttpError(400, "missing_shop_domain", "Brand is missing shopify_domain");
      }

      const webhookAddress = `${BACKEND_BASE_URL}/api/webhooks/shopify`;
      const adminApiBase = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}`;

      const { data: existingResponse } = await axios.get(`${adminApiBase}/webhooks.json`, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
        timeout: SHOPIFY_HTTP_TIMEOUT_MS,
      });

      const existingWebhooks: any[] = existingResponse?.webhooks || [];
      const existingTopicSet = new Set(
        existingWebhooks
          .filter((hook) => String(hook?.address || "").trim() === webhookAddress)
          .map((hook) => String(hook?.topic || "").trim()),
      );

      const createdTopics: string[] = [];
      const skippedTopics: string[] = [];
      const failedTopics: { topic: string; error: string }[] = [];

      for (const topic of WEBHOOK_TOPICS) {
        if (existingTopicSet.has(topic)) {
          skippedTopics.push(topic);
          continue;
        }

        try {
          await axios.post(
            `${adminApiBase}/webhooks.json`,
            {
              webhook: {
                topic,
                address: webhookAddress,
                format: "json",
              },
            },
            {
              headers: {
                "X-Shopify-Access-Token": accessToken,
              },
              timeout: SHOPIFY_HTTP_TIMEOUT_MS,
            },
          );
          createdTopics.push(topic);
        } catch (webhookError: any) {
          failedTopics.push({
            topic,
            error: webhookError?.response?.data?.errors || webhookError?.message || "unknown_error",
          });
        }
      }

      if (failedTopics.length === WEBHOOK_TOPICS.length) {
        throw new HttpError(
          502,
          "webhook_setup_failed",
          "Failed to register Shopify webhooks for all topics",
        );
      }

      logger.info("Shopify webhook setup completed", {
        brandId,
        requestedBy: req.user?.id,
        shopDomain,
        created: createdTopics.length,
        skipped: skippedTopics.length,
        failed: failedTopics.length,
      });

      await logAuditEvent({
        userId: req.user?.id,
        action: "shopify.webhooks.setup",
        tableName: "brands",
        recordId: brandId,
        meta: {
          requested_by: req.user?.id,
          webhook_address: webhookAddress,
          created_topics: createdTopics,
          skipped_topics: skippedTopics,
          failed_topics: failedTopics,
        },
      });

      res.json({
        success: true,
        message: `Webhook setup completed. Created ${createdTopics.length}, skipped ${skippedTopics.length}, failed ${failedTopics.length}.`,
        webhook_address: webhookAddress,
        created_topics: createdTopics,
        skipped_topics: skippedTopics,
        failed_topics: failedTopics,
      });
    } catch (error: any) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Failed to setup webhooks";
      res.status(status).json({ error: message });
    }
  },
);

/**
 * POST /api/shopify/disconnect/:brandId
 */
router.post(
  "/disconnect/:brandId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { brandId } = req.params;
      const brand = await findBrandById(brandId);
      if (!brand) {
        throw new HttpError(404, "brand_not_found", "Brand not found");
      }

      const beforeConnectionState = getPublicBrandConnection(brand as Record<string, unknown>);
      await clearBrandConnection(brand as Record<string, unknown>);
      const refreshedBrand = await findBrandById(brandId);
      const afterConnectionState = refreshedBrand
        ? getPublicBrandConnection(refreshedBrand as Record<string, unknown>)
        : null;

      await logAuditEvent({
        userId: req.user?.id,
        action: "shopify.disconnected",
        tableName: "brands",
        recordId: brandId,
        before: beforeConnectionState,
        after: afterConnectionState,
      });

      logger.info("Brand disconnected from Shopify", { brandId, userId: req.user?.id });
      res.json({ success: true, message: "Brand disconnected successfully" });
    } catch (error: any) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Failed to disconnect brand";
      logger.error("Disconnect failed", { error: error.message });
      res.status(status).json({ error: message });
    }
  },
);

/**
 * GET /api/shopify/status/:brandId
 */
router.get(
  "/status/:brandId",
  authenticate,
  async (_req: AuthRequest, res: Response) => {
    try {
      const { brandId } = _req.params;
      const brand = await findBrandById(brandId);
      if (!brand) {
        throw new HttpError(404, "brand_not_found", "Brand not found");
      }

      res.json(getPublicBrandConnection(brand as Record<string, unknown>));
    } catch (error: any) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Failed to get Shopify status";
      logger.error("Status request failed", { error: error.message });
      res.status(status).json({ error: message });
    }
  },
);

export default router;
