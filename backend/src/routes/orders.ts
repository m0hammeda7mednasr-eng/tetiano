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
import { assertUserBrandAccess, BrandAccessError, getUserPrimaryBrandId } from '../utils/brandAccess';

const router = Router();

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes('column') ||
    text.includes('relation') ||
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('unknown relationship')
  );
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

function buildCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.map((header) => escapeCsvValue(header)).join(',');
  const body = rows
    .map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','))
    .join('\n');
  return `${headerLine}\n${body}`;
}

// Get recent orders for a brand
router.get("/:brandId", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const { brandId } = req.params;
    const { limit = 20 } = req.query;

    await assertUserBrandAccess(req.user?.id, brandId);

    const { data: storedOrders, error: storedOrdersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at_shopify', { ascending: false, nullsFirst: false })
      .limit(Number(limit));

    if (!storedOrdersError) {
      return res.json({
        source: 'database',
        orders: storedOrders || [],
      });
    }

    if (!isSchemaCompatibilityError(storedOrdersError)) {
      throw storedOrdersError;
    }

    // Fallback for environments where migration 016 has not run yet.
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .maybeSingle();

    if (brandError) {
      throw brandError;
    }

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

    res.json({
      source: 'shopify_live',
      orders,
    });
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    logger.error('Get orders error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get recent customers for a brand
router.get("/:brandId/customers", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const { brandId } = req.params;
    const { limit = 50 } = req.query;

    await assertUserBrandAccess(req.user?.id, brandId);

    const { data: customers, error } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('brand_id', brandId)
      .order('updated_at_shopify', { ascending: false, nullsFirst: false })
      .limit(Number(limit));

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        return res.status(503).json({
          error: 'Missing required table shopify_customers. Run migration 016_single_store_and_shopify_data.sql',
        });
      }
      throw error;
    }

    res.json({ customers: customers || [] });
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    logger.error('Get customers error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Export orders in CSV format
router.get("/:brandId/export/orders", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const { brandId } = req.params;
    const { limit = 5000 } = req.query;

    await assertUserBrandAccess(req.user?.id, brandId);

    const { data: orders, error } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at_shopify', { ascending: false, nullsFirst: false })
      .limit(Number(limit));

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        return res.status(503).json({
          error: 'Missing required table shopify_orders. Run migration 016_single_store_and_shopify_data.sql',
        });
      }
      throw error;
    }

    const headers = [
      'shopify_order_id',
      'order_name',
      'order_number',
      'email',
      'financial_status',
      'fulfillment_status',
      'currency',
      'total_price',
      'current_total_price',
      'line_items_count',
      'created_at_shopify',
      'updated_at_shopify',
    ];

    const csv = buildCsv(headers, (orders || []) as Array<Record<string, unknown>>);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${brandId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    logger.error('Export orders error', { error: error.message });
    res.status(500).json({ error: 'Failed to export orders' });
  }
});

// Export customers in CSV format
router.get("/:brandId/export/customers", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const { brandId } = req.params;
    const { limit = 5000 } = req.query;

    await assertUserBrandAccess(req.user?.id, brandId);

    const { data: customers, error } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('brand_id', brandId)
      .order('updated_at_shopify', { ascending: false, nullsFirst: false })
      .limit(Number(limit));

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        return res.status(503).json({
          error: 'Missing required table shopify_customers. Run migration 016_single_store_and_shopify_data.sql',
        });
      }
      throw error;
    }

    const headers = [
      'shopify_customer_id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'state',
      'number_of_orders',
      'total_spent',
      'currency',
      'created_at_shopify',
      'updated_at_shopify',
    ];

    const csv = buildCsv(headers, (customers || []) as Array<Record<string, unknown>>);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${brandId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    logger.error('Export customers error', { error: error.message });
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

// Get recent Shopify webhook events
router.get("/webhooks/recent", authenticate, requirePermission("can_view_orders"), async (req: AuthRequest, res) => {
  try {
    const queryBrandId = req.query.brand_id ? String(req.query.brand_id) : null;
    const primaryBrandId = await getUserPrimaryBrandId(req.user?.id);
    const brandId = queryBrandId || primaryBrandId;

    if (!brandId) {
      return res.json({ events: [] });
    }
    await assertUserBrandAccess(req.user?.id, brandId);

    let query = supabase
      .from('shopify_webhook_events')
      .select('*, brands(name)')
      .order('created_at', { ascending: false })
      .limit(20);

    query = query.eq('brand_id', brandId);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ events: data || [] });
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    logger.error('Get recent webhooks error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch recent updates' });
  }
});

export default router;
