import { supabase } from '../config/supabase';
import { ShopifyService } from './shopify';
import { getShopifyConfig } from '../config/shopify';
import { logger } from '../utils/logger';

export interface StockMovement {
  variantId: string;
  brandId?: string;
  storeId?: string;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  source: 'webhook' | 'manual' | 'sync' | 'order' | 'refund' | 'adjustment';
  reason?: string;
  referenceId?: string;
  userId?: string;
}

function extractShopifyId(value: unknown): string {
  if (!value) return '';
  const parts = String(value).split('/');
  return parts[parts.length - 1] || '';
}

function resolveTenantId(input: { brandId?: string | null; storeId?: string | null }): string {
  return String(input.storeId || input.brandId || '').trim();
}

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    text.includes('column') ||
    text.includes('relation') ||
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('unknown relationship') ||
    text.includes('on conflict')
  );
}

async function upsertInventoryLevelScoped(
  variantId: string,
  tenantId: string,
  available: number,
): Promise<void> {
  const modern = await supabase.from('inventory_levels').upsert(
    {
      variant_id: variantId,
      store_id: tenantId,
      available,
    },
    { onConflict: 'variant_id' },
  );

  if (!modern.error) {
    return;
  }

  if (!isSchemaCompatibilityError(modern.error)) {
    throw modern.error;
  }

  const legacy = await supabase.from('inventory_levels').upsert(
    {
      variant_id: variantId,
      brand_id: tenantId,
      available,
    },
    { onConflict: 'variant_id' },
  );

  if (legacy.error) {
    throw legacy.error;
  }
}

async function insertStockMovementScoped(
  movement: StockMovement,
  tenantId: string,
): Promise<void> {
  const modern = await supabase.from('stock_movements').insert({
    variant_id: movement.variantId,
    store_id: tenantId,
    delta: movement.delta,
    previous_quantity: movement.previousQuantity,
    new_quantity: movement.newQuantity,
    source: movement.source,
    reason: movement.reason,
    reference_id: movement.referenceId,
    user_id: movement.userId,
  });

  if (!modern.error) {
    return;
  }

  if (!isSchemaCompatibilityError(modern.error)) {
    throw modern.error;
  }

  const legacy = await supabase.from('stock_movements').insert({
    variant_id: movement.variantId,
    brand_id: tenantId,
    delta: movement.delta,
    previous_quantity: movement.previousQuantity,
    new_quantity: movement.newQuantity,
    source: movement.source,
    reason: movement.reason,
    reference_id: movement.referenceId,
    user_id: movement.userId,
  });

  if (legacy.error) {
    throw legacy.error;
  }
}

async function upsertEntityIdWithTenantFallback(params: {
  table: string;
  tenantId: string;
  fullPayload: Record<string, unknown>;
  minimalPayload: Record<string, unknown>;
  modernConflict: string;
  legacyConflict: string;
}): Promise<string> {
  const attempts = [
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.fullPayload, store_id: params.tenantId }, { onConflict: params.modernConflict })
        .select('id')
        .single(),
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.minimalPayload, store_id: params.tenantId }, { onConflict: params.modernConflict })
        .select('id')
        .single(),
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.fullPayload, brand_id: params.tenantId }, { onConflict: params.legacyConflict })
        .select('id')
        .single(),
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.minimalPayload, brand_id: params.tenantId }, { onConflict: params.legacyConflict })
        .select('id')
        .single(),
  ];

  let lastSchemaError: any = null;
  for (const attempt of attempts) {
    const result = await attempt();
    if (!result.error) {
      return String(result.data.id);
    }
    if (!isSchemaCompatibilityError(result.error)) {
      throw result.error;
    }
    lastSchemaError = result.error;
  }

  throw lastSchemaError || new Error(`Failed to upsert ${params.table}`);
}

export class InventoryService {
  // Record stock movement in ledger
  async recordStockMovement(movement: StockMovement): Promise<void> {
    const tenantId = resolveTenantId(movement);
    if (!tenantId) {
      throw new Error('store_id context is required to record stock movement');
    }

    try {
      await insertStockMovementScoped(movement, tenantId);
      logger.info('Stock movement recorded', { ...movement, storeId: tenantId });
    } catch (error: any) {
      logger.error('Failed to record stock movement', {
        error: error?.message || error,
        movement: { ...movement, storeId: tenantId },
      });
      throw error;
    }
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
    const tenantId = resolveTenantId({ storeId: brandId });
    if (!tenantId) {
      throw new Error('store_id context is required to update inventory level');
    }

    await upsertInventoryLevelScoped(variantId, tenantId, newQuantity);

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
    let variantResult = await supabase
      .from('variants')
      .select(
        'id, store_id, brand_id, shopify_variant_id, inventory_item_id, brands(*)',
      )
      .eq('id', variantId)
      .single();

    if (variantResult.error && isSchemaCompatibilityError(variantResult.error)) {
      variantResult = await supabase
        .from('variants')
        .select(
          'id, brand_id, shopify_variant_id, inventory_item_id, brands(*)',
        )
        .eq('id', variantId)
        .single();
    }

    const variant = variantResult.data as Record<string, any> | null;
    if (variantResult.error || !variant) {
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
    const brandInfo = Array.isArray(variant.brands)
      ? (variant.brands[0] as any)
      : (variant.brands as any);
    if (!brandInfo) {
      throw new Error('Brand configuration not found for variant');
    }
    const brandName = brandInfo.name;
    const shopifyConfig = getShopifyConfig(brandName, {
      domain: brandInfo.shopify_domain,
      accessToken: brandInfo.shopify_access_token,
      legacyAccessToken: brandInfo.access_token,
      locationId: brandInfo.shopify_location_id,
    });
    const shopifyService = new ShopifyService(shopifyConfig);

    // Adjust in Shopify
    const inventoryItemId = variant.inventory_item_id || variant.shopify_variant_id;
    if (!inventoryItemId) {
      throw new Error('Variant is missing Shopify inventory identifier');
    }
    await shopifyService.adjustInventory(inventoryItemId, delta, reason);

    const tenantId = resolveTenantId({
      storeId: variant.store_id as string | undefined,
      brandId: variant.brand_id as string | undefined,
    });
    if (!tenantId) {
      throw new Error('Variant is missing tenant scope');
    }

    // Update local inventory
    await this.updateInventoryLevel(variantId, tenantId, newQuantity);

    // Record movement
    await this.recordStockMovement({
      variantId,
      storeId: tenantId,
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
      storeId: tenantId,
    });
  }

  // Sync product from Shopify
  async syncProduct(storeId: string, shopifyProductId: string): Promise<void> {
    const tenantId = resolveTenantId({ storeId });
    if (!tenantId) {
      throw new Error('store_id context is required');
    }

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (brandError) {
      throw brandError;
    }

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

    const fullProductPayload = {
      shopify_product_id: shopifyProductId,
      title: product.title,
      handle: product.handle,
      product_type: product.productType,
      vendor: product.vendor,
      status: product.status,
      shopify_payload: product,
    };
    const minimalProductPayload = {
      shopify_product_id: shopifyProductId,
      title: product.title,
      handle: product.handle,
      product_type: product.productType,
      vendor: product.vendor,
      status: product.status,
    };

    const dbProductId = await upsertEntityIdWithTenantFallback({
      table: 'products',
      tenantId,
      fullPayload: fullProductPayload,
      minimalPayload: minimalProductPayload,
      modernConflict: 'store_id,shopify_product_id',
      legacyConflict: 'brand_id,shopify_product_id',
    });

    // Sync variants
    for (const variantEdge of product.variants.edges) {
      const variant = variantEdge.node;
      const shopifyVariantId = extractShopifyId(variant.id);
      if (!shopifyVariantId) {
        continue;
      }

      const selectedOptions = Array.isArray(variant.selectedOptions) ? variant.selectedOptions : [];
      const option1 = selectedOptions[0]?.value || null;
      const option2 = selectedOptions[1]?.value || null;
      const option3 = selectedOptions[2]?.value || null;

      const fullVariantPayload = {
        product_id: dbProductId,
        shopify_variant_id: shopifyVariantId,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price ? parseFloat(variant.price) : null,
        compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
        position: Number.isFinite(Number(variant.position)) ? Number(variant.position) : null,
        option1,
        option2,
        option3,
        inventory_item_id: extractShopifyId(variant.inventoryItem?.id) || null,
        inventory_quantity: Number.isFinite(Number(variant.inventoryQuantity))
          ? Number(variant.inventoryQuantity)
          : null,
        shopify_payload: variant,
      };

      const minimalVariantPayload = {
        product_id: dbProductId,
        shopify_variant_id: shopifyVariantId,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price ? parseFloat(variant.price) : null,
        compare_at_price: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
        position: Number.isFinite(Number(variant.position)) ? Number(variant.position) : null,
        option1,
        option2,
        option3,
      };

      const dbVariantId = await upsertEntityIdWithTenantFallback({
        table: 'variants',
        tenantId,
        fullPayload: fullVariantPayload,
        minimalPayload: minimalVariantPayload,
        modernConflict: 'store_id,shopify_variant_id',
        legacyConflict: 'brand_id,shopify_variant_id',
      });

      const inventoryQuantity = Number.isFinite(Number(variant.inventoryQuantity))
        ? Number(variant.inventoryQuantity)
        : 0;

      await upsertInventoryLevelScoped(dbVariantId, tenantId, inventoryQuantity);
    }

    logger.info('Product synced', { storeId: tenantId, shopifyProductId });
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
