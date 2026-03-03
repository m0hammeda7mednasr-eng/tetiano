import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireRole,
  AuthRequest,
} from "../middleware/auth";
import { InventoryService } from '../services/inventory';
import { ShopifyService } from '../services/shopify';
import { getShopifyConfig } from '../config/shopify';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();
const inventoryService = new InventoryService();

// Get all inventory with filters
router.get("/", authenticate, requirePermission("can_view_inventory"), async (req: AuthRequest, res) => {
  try {
    const { brand_id, search, page = 1, limit = 50 } = req.query;

    let query = supabase
      .from('variants')
      .select(
        `
        *,
        products(title, handle, product_type, vendor),
        inventory_levels(available),
        brands(name)
      `
      )
      .order('created_at', { ascending: false });

    if (brand_id) {
      query = query.eq('brand_id', brand_id);
    }

    if (search) {
      query = query.or(
        `sku.ilike.%${search}%,title.ilike.%${search}%,barcode.ilike.%${search}%`
      );
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
      },
    });
  } catch (error: any) {
    logger.error('Get inventory error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Get variant details with stock movements
router.get("/:variantId", authenticate, requirePermission("can_view_inventory"), async (req: AuthRequest, res) => {
  try {
    const { variantId } = req.params;

    const { data: variant, error: variantError } = await supabase
      .from('variants')
      .select(
        `
        *,
        products(title, handle, product_type, vendor),
        inventory_levels(available),
        brands(name)
      `
      )
      .eq('id', variantId)
      .single();

    if (variantError) {
      throw variantError;
    }

    const movements = await inventoryService.getStockMovements(variantId);

    res.json({
      variant,
      movements,
    });
  } catch (error: any) {
    logger.error('Get variant error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch variant details' });
  }
});

// Manual stock adjustment
router.post(
  '/:variantId/adjust',
  authenticate,
  requirePermission("can_edit_inventory"),
  async (req: AuthRequest, res) => {
    try {
      const { variantId } = req.params;
      const { delta, reason } = req.body;

      if (!delta || typeof delta !== 'number') {
        return res.status(400).json({ error: 'Invalid delta value' });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Reason is required' });
      }

      await inventoryService.adjustStock(
        variantId,
        delta,
        reason.trim(),
        req.user!.id
      );

      res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error: any) {
      logger.error('Adjust stock error', { error: error.message });
      res.status(500).json({ error: error.message || 'Failed to adjust stock' });
    }
  }
);

// Get stock movements for variant
router.get("/:variantId/movements", authenticate, requirePermission("can_view_inventory"), async (req: AuthRequest, res) => {
  try {
    const { variantId } = req.params;
    const { limit = 50 } = req.query;

    const movements = await inventoryService.getStockMovements(
      variantId,
      Number(limit)
    );

    res.json({ movements });
  } catch (error: any) {
    logger.error('Get movements error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Sync product from Shopify
router.post(
  '/sync/:brandId/:productId',
  authenticate,
  requireRole('manager'),
  async (req: AuthRequest, res) => {
    try {
      const { brandId, productId } = req.params;

      await inventoryService.syncProduct(brandId, productId);

      res.json({ success: true, message: 'Product synced successfully' });
    } catch (error: any) {
      logger.error('Sync product error', { error: error.message });
      res.status(500).json({ error: error.message || 'Failed to sync product' });
    }
  }
);

// Sync all products for a brand
router.post(
  '/sync-brand/:brandId',
  authenticate,
  requireRole('manager'),
  async (req: AuthRequest, res) => {
    try {
      const { brandId } = req.params;

      const { data: brand } = await supabase
        .from('brands')
        .select(
          'name, shopify_domain, shopify_location_id, shopify_access_token, access_token',
        )
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

      const products = await shopifyService.syncAllProducts();

      for (const product of products) {
        await inventoryService.syncProduct(brandId, product.id.split('/').pop());
      }

      // Update last_sync_at timestamp
      await supabase
        .from('brands')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', brandId);

      res.json({ success: true, message: `تمت مزامنة ${products.length} منتجاً بنجاح` });

    } catch (error: any) {
      logger.error('Sync brand error', { error: error.message });
      res.status(500).json({ error: error.message || 'Failed to sync brand' });
    }
  }
);

export default router;
