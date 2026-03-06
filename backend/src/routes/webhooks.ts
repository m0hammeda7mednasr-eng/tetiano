import { Router, Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import { WebhookHandler } from "../services/webhookHandler";

const router = Router();
const webhookHandler = new WebhookHandler();
const GLOBAL_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || "";

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}

function isMultipleRowsError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return text.includes("multiple") && text.includes("rows");
}

function verifyHmac(rawBody: Buffer | string, hmacHeader: string, secret: string): boolean {
  if (!hmacHeader || !secret) return false;
  const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

async function insertWebhookEvent(params: {
  storeId: string | null;
  topic: string;
  shopDomain: string;
  payload: any;
  webhookId: string;
}) {
  const now = new Date().toISOString();
  const payloads: Record<string, unknown>[] = [
    {
      store_id: params.storeId,
      brand_id: params.storeId,
      webhook_id: params.webhookId,
      topic: params.topic,
      payload: params.payload,
      status: "pending",
      received_at: now,
    },
    {
      brand_id: params.storeId,
      shop: params.shopDomain,
      topic: params.topic,
      data: params.payload,
      processed: false,
    },
    {
      event_hash: params.webhookId,
      brand_id: params.storeId,
      topic: params.topic,
      payload: params.payload,
      processed: false,
    },
  ];

  for (const payload of payloads) {
    const result = await supabase.from("shopify_webhook_events").insert(payload);
    if (!result.error) return;
    if (!isSchemaCompatibilityError(result.error)) {
      logger.warn("Webhook event insert failed", { error: result.error.message });
      return;
    }
  }
}

async function markWebhookStatus(webhookId: string, status: "processed" | "failed", errorMessage?: string) {
  const updates: Record<string, unknown>[] = [
    {
      status,
      processed_at: new Date().toISOString(),
      error: errorMessage || null,
    },
    {
      processed: status === "processed",
      processed_at: new Date().toISOString(),
      error: errorMessage || null,
    },
  ];

  for (const update of updates) {
    const byWebhook = await supabase
      .from("shopify_webhook_events")
      .update(update)
      .eq("webhook_id", webhookId);
    if (!byWebhook.error) return;

    const byEventHash = await supabase
      .from("shopify_webhook_events")
      .update(update)
      .eq("event_hash", webhookId);
    if (!byEventHash.error) return;
  }
}

router.post("/shopify", async (req: Request, res: Response) => {
  const hmacHeader = String(req.headers["x-shopify-hmac-sha256"] || "");
  const topic = String(req.headers["x-shopify-topic"] || "");
  const shopDomain = String(req.headers["x-shopify-shop-domain"] || "");
  const webhookIdHeader = String(req.headers["x-shopify-webhook-id"] || "");
  const rawBody = req.body as Buffer;

  if (!rawBody || !rawBody.length) {
    logger.warn("Webhook rejected: empty body", { topic, shopDomain });
    return res.status(400).json({ error: "Empty body" });
  }

  let webhookSecret = GLOBAL_WEBHOOK_SECRET;
  let storeId: string | null = null;

  if (shopDomain) {
    try {
      const byDomain = await supabase
        .from("brands")
        .select("id, webhook_secret, api_secret")
        .eq("shopify_domain", shopDomain)
        .maybeSingle();

      let brand = byDomain.data;
      if (byDomain.error && isMultipleRowsError(byDomain.error)) {
        const fallback = await supabase
          .from("brands")
          .select("id, webhook_secret, api_secret")
          .eq("shopify_domain", shopDomain)
          .limit(1)
          .maybeSingle();
        brand = fallback.data;
      }

      if (brand?.id) storeId = String(brand.id);
      if (brand?.webhook_secret) webhookSecret = String(brand.webhook_secret);
      else if (brand?.api_secret) webhookSecret = String(brand.api_secret);
    } catch {
      // Ignore lookup errors and use global secret.
    }
  }

  if (!verifyHmac(rawBody, hmacHeader, webhookSecret)) {
    logger.warn("Webhook rejected: invalid signature", { topic, shopDomain });
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    logger.warn("Webhook rejected: invalid JSON", { topic, shopDomain });
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const webhookId =
    webhookIdHeader ||
    crypto.createHash("sha256").update(`${topic}:${shopDomain}:${rawBody.toString("utf8")}`).digest("hex");

  await insertWebhookEvent({
    storeId,
    topic,
    shopDomain,
    payload,
    webhookId,
  });

  logger.info("Webhook accepted", { topic, shopDomain, webhookId });
  res.status(200).json({ received: true });

  webhookHandler
    .handle(topic, payload, shopDomain)
    .then(async () => {
      await markWebhookStatus(webhookId, "processed");
    })
    .catch(async (error: any) => {
      logger.error("Webhook async processing failed", {
        topic,
        shopDomain,
        webhookId,
        error: error?.message,
      });
      await markWebhookStatus(webhookId, "failed", error?.message || "processing_error");
    });
});

export default router;

