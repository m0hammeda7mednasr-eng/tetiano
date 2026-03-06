import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireRole,
  AuthRequest,
} from "../middleware/auth";
import { InventoryService } from '../services/inventory';
import { ShopifySyncService } from '../services/shopifySync';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { assertUserBrandAccess, BrandAccessError, getUserPrimaryBrandId } from '../utils/brandAccess';

const router = Router();
const inventoryService = new InventoryService();
const shopifySyncService = new ShopifySyncService();

async function getVariantBrandId(variantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('variants')
    .select('brand_id')
    .eq('id', variantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.brand_id || null;
}

// Get all inventory with filters
router.get("/", authenticate, requirePermission("can_view_inventory"), async (req: AuthRequest, res) => {
  try {
    const { brand_id, search, page = 1, limit = 50 } = req.query;
    const primaryBrandId = await getUserPrimaryBrandId(req.user?.id);
    const effectiveBrandId = String(brand_id || primaryBrandId || '');

    if (effectiveBrandId) {
      await assertUserBrandAccess(req.user?.id, effectiveBrandId);
    } else {
      return res.json({
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
        },
      });
    }

    let query = supabase
      .from('variants')
      .select(
        `
        *,
        products(title, handle, product_type, vendor),
        inventory_levels(available),
        brands(name)
      `,
      )
      .order('created_at', { ascending: false });

    query = query.eq('brand_id', effectiveBrandId);

    if (search) {
      query = query.or(
        `sku.ilike.%${search}%,title.ilike.%${search}%,barcode.ilike.%${search}%`,
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
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

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
      `,
      )
      .eq('id', variantId)
      .single();

    if (variantError) {
      throw variantError;
    }

    await assertUserBrandAccess(req.user?.id, String(variant.brand_id));

    const movements = await inventoryService.getStockMovements(variantId);

    res.json({
      variant,
      movements,
    });
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

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

      const brandId = await getVariantBrandId(variantId);
      if (!brandId) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      await assertUserBrandAccess(req.user?.id, brandId);

      await inventoryService.adjustStock(
        variantId,
        delta,
        reason.trim(),
        req.user!.id,
      );

      res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error: any) {
      if (error instanceof BrandAccessError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }

      logger.error('Adjust stock error', { error: error.message });
      res.status(500).json({ error: error.message || 'Failed to adjust stock' });
    }
  },
);

// Get stock movements for variant
router.get("/:variantId/movements", authenticate, requirePermission("can_view_inventory"), async (req: AuthRequest, res) => {
  try {
    const { variantId } = req.params;
    const { limit = 50 } = req.query;

    const brandId = await getVariantBrandId(variantId);
    if (!brandId) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    await assertUserBrandAccess(req.user?.id, brandId);

    const movements = await inventoryService.getStockMovements(
      variantId,
      Number(limit),
    );

    res.json({ movements });
  } catch (error: any) {
    if (error instanceof BrandAccessError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    logger.error('Get movements error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Sync one product from Shopify
router.post(
  '/sync/:brandId/:productId',
  authenticate,
  requireRole('manager'),
  async (req: AuthRequest, res) => {
    try {
      const { brandId, productId } = req.params;
      await assertUserBrandAccess(req.user?.id, brandId);

      await inventoryService.syncProduct(brandId, productId);

      res.json({ success: true, message: 'Product synced successfully' });
    } catch (error: any) {
      if (error instanceof BrandAccessError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }

      logger.error('Sync product error', { error: error.message });
      res.status(500).json({ error: error.message || 'Failed to sync product' });
    }
  },
);

// Full sync brand data from Shopify
router.post(
  '/sync-brand/:brandId',
  authenticate,
  requireRole('manager'),
  async (req: AuthRequest, res) => {
    try {
      const { brandId } = req.params;
      await assertUserBrandAccess(req.user?.id, brandId);

      const wipeExistingData = String(req.query.wipe ?? '1') !== '0';
      const summary = await shopifySyncService.syncBrand(brandId, { wipeExistingData });

      res.json({
        success: true,
        message: 'Shopify full sync completed successfully',
        summary,
      });
    } catch (error: any) {
      if (error instanceof BrandAccessError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }

      // Better error messages
      let errorMessage = error.message || 'Failed to sync brand';
      let statusCode = 500;

      if (errorMessage.includes('not connected to Shopify')) {
        statusCode = 400;
      } else if (errorMessage.includes('Invalid Shopify configuration')) {
        statusCode = 400;
        errorMessage = 'Shopify store is not properly configured. Please check your Shopify connection settings.';
      } else if (errorMessage.includes('Brand not found')) {
        statusCode = 404;
      }

      logger.error('Sync brand error', { 
        error: error.message, 
        brandId: req.params.brandId,
        stack: error.stack 
      });
      
      res.status(statusCode).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },
);

export default router;
