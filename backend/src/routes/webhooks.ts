/**
 * Shopify Webhook Handler
 * ──────────────────────────────────────────────────────────
 * IMPORTANT: This route must receive raw (unparsed) body.
 * In index.ts: app.use('/api/webhooks', express.raw({ type: 'application/json' }))
 * must come BEFORE express.json()
 *
 * HMAC Verification:
 *   - We look up the brand by shop domain
 *   - Use the brand's own webhook_secret if set, else fall back to env
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { WebhookHandler } from '../services/webhookHandler';

const router = Router();
const webhookHandler = new WebhookHandler();

// Global fallback webhook secret (from env)
const GLOBAL_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

/** Verify Shopify HMAC-SHA256 signature */
function verifyHmac(rawBody: Buffer | string, hmacHeader: string, secret: string): boolean {
  if (!hmacHeader || !secret) return false;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hmacHeader),
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  POST /api/webhooks/shopify
// ─────────────────────────────────────────────────────────────
router.post('/shopify', async (req: Request, res: Response) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;
  const topic = req.headers['x-shopify-topic'] as string;
  const shopDomain = req.headers['x-shopify-shop-domain'] as string;

  // Raw body is a Buffer (because express.raw middleware)
  const rawBody = req.body as Buffer;

  if (!rawBody || !rawBody.length) {
    logger.warn('Webhook: empty body', { topic, shopDomain });
    return res.status(400).json({ error: 'Empty body' });
  }

  // ── Look up brand to get its webhook secret ────────────────
  let webhookSecret = GLOBAL_WEBHOOK_SECRET;
  let brand: any = null;

  if (shopDomain) {
    try {
      const { data } = await supabase
        .from('brands')
        .select('id, webhook_secret, api_secret')
        .eq('shopify_domain', shopDomain)
        .single();

      brand = data;
      // Prefer brand-specific secret, fallback to api_secret, then global
      if (data?.webhook_secret) webhookSecret = data.webhook_secret;
      else if (data?.api_secret) webhookSecret = data.api_secret;
    } catch { /* use global secret */ }
  }

  // ── Verify HMAC ────────────────────────────────────────────
  if (!verifyHmac(rawBody, hmacHeader, webhookSecret)) {
    logger.warn('Webhook: HMAC verification failed', { topic, shopDomain });
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // ── Parse body ─────────────────────────────────────────────
  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    logger.error('Webhook: JSON parse failed', { topic, shopDomain });
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  logger.info('Webhook received', { topic, shopDomain });

  // ── Respond immediately (Shopify requires < 5s) ────────────
  res.status(200).json({ received: true });

  // ── Process asynchronously ─────────────────────────────────
  webhookHandler.handle(topic, payload, shopDomain).catch((err: any) => {
    logger.error('Webhook async processing failed', {
      error: err.message,
      topic,
      shopDomain,
    });
  });
});

export default router;
