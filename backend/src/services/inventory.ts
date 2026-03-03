import { supabase } from '../config/supabase';
import { ShopifyService } from './shopify';
import { getShopifyConfig } from '../config/shopify';
import { logger } from '../utils/logger';

export interface StockMovement {
  variantId: string;
  brandId: string;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  source: 'webhook' | 'manual' | 'sync' | 'order' | 'refund' | 'adjustment';
  reason?: string;
  referenceId?: string;
  userId?: string;
}

export class InventoryService {
  // Record stock movement in ledger
  async recordStockMovement(movement: StockMovement): Promise<void> {
    const { error } = await supabase.from('stock_movements').insert({
      variant_id: movement.variantId,
      brand_id: movement.brandId,
      delta: movement.delta,
      previous_quantity: movement.previousQuantity,
      new_quantity: movement.newQuantity,
      source: movement.source,
      reason: movement.reason,
      reference_id: movement.referenceId,
      user_id: movement.userId,
    });

    if (error) {
      logger.error('Failed to record stock movement', { error, movement });
      throw error;
    }

    logger.info('Stock movement recorded', movement);
  }

  // Update inventory level
  async updateInventoryLevel(
    variantId: string,
    brandId: string,
    newQuantity: number
  ): Promise<number> {
    // Get current quantity
    const { data: current, error: fetchError } = await supabase
      .from('inventory_levels')
      .select('available')
      .eq('variant_id', variantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const previousQuantity = current?.available || 0;

    // Upsert new quantity
    const { error: upsertError } = await supabase
      .from('inventory_levels')
      .upsert(
        {
          variant_id: variantId,
          brand_id: brandId,
          available: newQuantity,
        },
        { onConflict: 'variant_id' }
      );

    if (upsertError) {
      logger.error('Failed to update inventory level', { error: upsertError });
      throw upsertError;
    }

    return previousQuantity;
  }

  // Manual adjustment
  async adjustStock(
    variantId: string,
    delta: number,
    reason: string,
    userId: string
  ): Promise<void> {
    // Get variant and brand info
    const { data: variant, error: variantError } = await supabase
      .from('variants')
      .select(
        'id, brand_id, shopify_variant_id, brands(name, shopify_domain, shopify_location_id, shopify_access_token, access_token)',
      )
      .eq('id', variantId)
      .single();

    if (variantError || !variant) {
      throw new Error('Variant not found');
    }

    // Get current inventory
    const { data: inventory } = await supabase
      .from('inventory_levels')
      .select('available')
      .eq('variant_id', variantId)
      .single();

    const previousQuantity = inventory?.available || 0;
    const newQuantity = previousQuantity + delta;

    if (newQuantity < 0) {
      throw new Error('Resulting quantity cannot be negative');
    }

    // Get Shopify config
    const brandInfo = variant.brands as any;
    const brandName = brandInfo.name;
    const shopifyConfig = getShopifyConfig(brandName, {
      domain: brandInfo.shopify_domain,
      accessToken: brandInfo.shopify_access_token,
      legacyAccessToken: brandInfo.access_token,
      locationId: brandInfo.shopify_location_id,
    });
    const shopifyService = new ShopifyService(shopifyConfig);

    // Adjust in Shopify
    const inventoryItemId = variant.shopify_variant_id;
    await shopifyService.adjustInventory(inventoryItemId, delta, reason);

    // Update local inventory
    await this.updateInventoryLevel(variantId, variant.brand_id, newQuantity);

    // Record movement
    await this.recordStockMovement({
      variantId,
      brandId: variant.brand_id,
      delta,
      previousQuantity,
      newQuantity,
      source: 'manual',
      reason,
      userId,
    });

    logger.info('Stock adjusted manually', {
      variantId,
      delta,
      reason,
      userId,
    });
  }

  // Sync product from Shopify
  async syncProduct(brandId: string, shopifyProductId: string): Promise<void> {
    const { data: brand } = await supabase
      .from('brands')
      .select('name, shopify_domain, shopify_location_id, shopify_access_token, access_token')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw new Error('Brand not found');
    }

    const shopifyConfig = getShopifyConfig(brand.name, {
      domain: brand.shopify_domain,
      accessToken: brand.shopify_access_token,
      legacyAccessToken: brand.access_token,
      locationId: brand.shopify_location_id,
    });
    const shopifyService = new ShopifyService(shopifyConfig);

    const product = await shopifyService.getProduct(shopifyProductId);

    if (!product) {
      throw new Error('Product not found in Shopify');
    }

    // Upsert product
    const { data: dbProduct, error: productError } = await supabase
      .from('products')
      .upsert(
        {
          brand_id: brandId,
          shopify_product_id: shopifyProductId,
          title: product.title,
          handle: product.handle,
          product_type: product.productType,
          vendor: product.vendor,
          status: product.status,
        },
        { onConflict: 'brand_id,shopify_product_id' }
      )
      .select()
      .single();

    if (productError) {
      throw productError;
    }

    // Sync variants
    for (const variantEdge of product.variants.edges) {
      const variant = variantEdge.node;
      const shopifyVariantId = variant.id.split('/').pop();

      await supabase.from('variants').upsert(
        {
          product_id: dbProduct.id,
          brand_id: brandId,
          shopify_variant_id: shopifyVariantId,
          title: variant.title,
          sku: variant.sku,
          barcode: variant.barcode,
          price: parseFloat(variant.price),
          compare_at_price: variant.compareAtPrice
            ? parseFloat(variant.compareAtPrice)
            : null,
        },
        { onConflict: 'brand_id,shopify_variant_id' }
      );
    }

    logger.info('Product synced', { brandId, shopifyProductId });
  }

  // Get stock movements for variant
  async getStockMovements(variantId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(
        `
        *,
        user_profiles(full_name)
      `
      )
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data;
  }
}
