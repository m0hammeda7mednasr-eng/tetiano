import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  AuthRequest,
} from "../middleware/auth";
import { ShopifyService } from '../services/shopify';
import { getShopifyConfig } from '../config/shopify';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

// Get recent orders from Shopify for a brand
router.get("/:brandId", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const { brandId } = req.params;
    const { limit = 10 } = req.query;

    const { data: brand } = await supabase
      .from('brands')
      .select('name, shopify_domain, shopify_location_id, shopify_access_token, access_token')
      .eq('id', brandId)
      .single();

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const shopifyConfig = getShopifyConfig(brand.name, {
      domain: brand.shopify_domain,
      accessToken: brand.shopify_access_token,
      legacyAccessToken: brand.access_token,
      locationId: brand.shopify_location_id,
    });
    const shopifyService = new ShopifyService(shopifyConfig);

    const orders = await shopifyService.getRecentOrders(Number(limit));

    res.json({ orders });
  } catch (error: any) {
    logger.error('Get orders error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch orders from Shopify' });
  }
});

// Get recent Shopify webhook events
router.get("/webhooks/recent", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('shopify_webhook_events')
      .select('*, brands(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ events: data });
  } catch (error: any) {
    logger.error('Get recent webhooks error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch recent updates' });
  }
});

export default router;
