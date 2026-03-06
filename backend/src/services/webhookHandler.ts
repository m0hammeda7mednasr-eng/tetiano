import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { InventoryService } from './inventory';
import { logger } from '../utils/logger';

function extractShopifyId(value: unknown): string {
  if (!value) return '';
  const parts = String(value).split('/');
  return parts[parts.length - 1] || '';
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    text.includes('column') ||
    text.includes('relation') ||
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('unknown relationship')
  );
}

function isMultipleRowsError(error: any): boolean {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return text.includes('multiple') && text.includes('rows');
}

export class WebhookHandler {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  // Check if event already processed (idempotency)
  private async isEventProcessed(eventHash: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('shopify_webhook_events')
      .select('id')
      .eq('event_hash', eventHash)
      .eq('processed', true)
      .maybeSingle();

    if (error) {
      if (isSchemaCompatibilityError(error)) {
        return false;
      }
      throw error;
    }

    return !!data;
  }

  // Store webhook event with schema compatibility fallback
  private async storeEvent(
    eventHash: string,
    topic: string,
    shopifyId: string,
    brandId: string,
    payload: any,
    shopDomain: string,
  ): Promise<void> {
    const legacyInsert = await supabase.from('shopify_webhook_events').insert({
      event_hash: eventHash,
      topic,
      shopify_id: shopifyId,
      brand_id: brandId,
      payload,
      processed: true,
    });

    if (!legacyInsert.error) {
      return;
    }

    if (!isSchemaCompatibilityError(legacyInsert.error)) {
      throw legacyInsert.error;
    }

    const modernInsert = await supabase.from('shopify_webhook_events').insert({
      brand_id: brandId,
      shop: shopDomain,
      topic,
      event_id: shopifyId,
      data: payload,
      processed: true,
      processed_at: new Date().toISOString(),
    });

    if (modernInsert.error && !isSchemaCompatibilityError(modernInsert.error)) {
      throw modernInsert.error;
    }
  }

  // Get brand by shop domain
  private async getBrandByDomain(shopDomain: string): Promise<any> {
    const result = await supabase
      .from('brands')
      .select('*')
      .eq('shopify_domain', shopDomain)
      .maybeSingle();

    if (!result.error) {
      if (!result.data) {
        throw new Error(`Brand not found: ${shopDomain}`);
      }
      return result.data;
    }

    if (!isMultipleRowsError(result.error)) {
      logger.error('Brand lookup failed for domain', { shopDomain, error: result.error.message });
      throw result.error;
    }

    const fallback = await supabase
      .from('brands')
      .select('*')
      .eq('shopify_domain', shopDomain)
      .limit(1)
      .maybeSingle();

    if (fallback.error || !fallback.data) {
      logger.error('Brand fallback lookup failed', {
        shopDomain,
        error: fallback.error?.message,
      });
      throw fallback.error || new Error(`Brand not found: ${shopDomain}`);
    }

    logger.warn('Multiple brands share same shopify_domain; fallback to latest record', { shopDomain });
    return fallback.data;
  }

  // Main handler
  async handle(topic: string, payload: any, shopDomain: string): Promise<void> {
    try {
      const eventHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(payload) + topic + shopDomain)
        .digest('hex');

      if (await this.isEventProcessed(eventHash)) {
        logger.info('Event already processed, skipping', { eventHash, topic });
        return;
      }

      const brand = await this.getBrandByDomain(shopDomain);

      switch (topic) {
        case 'inventory_levels/update':
          await this.handleInventoryUpdate(payload, brand, eventHash, shopDomain);
          break;
        case 'orders/create':
        case 'orders/paid':
          await this.handleOrderUpsert(payload, brand, eventHash, topic, shopDomain, true);
          break;
        case 'orders/updated':
          await this.handleOrderUpsert(payload, brand, eventHash, topic, shopDomain, false);
          break;
        case 'orders/cancelled':
          await this.handleOrderCancel(payload, brand, eventHash, shopDomain);
          break;
        case 'refunds/create':
          await this.handleRefundCreate(payload, brand, eventHash, shopDomain);
          break;
        case 'products/create':
        case 'products/update':
          await this.handleProductUpsert(payload, brand, eventHash, topic, shopDomain);
          break;
        case 'products/delete':
          await this.handleProductDelete(payload, brand, eventHash, shopDomain);
          break;
        case 'customers/create':
        case 'customers/update':
          await this.handleCustomerUpsert(payload, brand, eventHash, topic, shopDomain);
          break;
        case 'customers/delete':
          await this.handleCustomerDelete(payload, brand, eventHash, shopDomain);
          break;
        default:
          await this.storeEvent(
            eventHash,
            topic,
            String(payload?.id || payload?.admin_graphql_api_id || ''),
            brand.id,
            payload,
            shopDomain,
          );
          logger.warn('Unhandled webhook topic', { topic });
      }

      logger.info('Webhook processed successfully', { topic, eventHash });
    } catch (error: any) {
      logger.error('Webhook handler error', {
        error: error.message,
        topic,
        shopDomain,
      });
      throw error;
    }
  }

  private async findVariantByShopifyIdentifiers(
    brandId: string,
    variantId?: string | null,
    inventoryItemId?: string | null,
  ): Promise<{ id: string } | null> {
    if (inventoryItemId) {
      const byInventoryItem = await supabase
        .from('variants')
        .select('id')
        .eq('brand_id', brandId)
        .eq('inventory_item_id', inventoryItemId)
        .maybeSingle();

      if (!byInventoryItem.error && byInventoryItem.data) {
        return byInventoryItem.data as { id: string };
      }

      if (byInventoryItem.error && !isSchemaCompatibilityError(byInventoryItem.error)) {
        throw byInventoryItem.error;
      }
    }

    if (!variantId) return null;

    const byVariantId = await supabase
      .from('variants')
      .select('id')
      .eq('brand_id', brandId)
      .eq('shopify_variant_id', variantId)
      .maybeSingle();

    if (byVariantId.error) {
      throw byVariantId.error;
    }

    return (byVariantId.data as { id: string } | null) || null;
  }

  // Handle inventory level update
  private async handleInventoryUpdate(
    payload: any,
    brand: any,
    eventHash: string,
    shopDomain: string,
  ): Promise<void> {
    const inventoryItemId = payload.inventory_item_id?.toString() || '';
    const available = Number.isFinite(Number(payload.available)) ? Number(payload.available) : 0;

    const variant = await this.findVariantByShopifyIdentifiers(
      brand.id,
      payload.variant_id?.toString() || null,
      inventoryItemId || null,
    );

    if (!variant) {
      logger.warn('Variant not found for inventory update', {
        brandId: brand.id,
        inventoryItemId,
        variantId: payload.variant_id,
      });
      await this.storeEvent(eventHash, 'inventory_levels/update', inventoryItemId, brand.id, payload, shopDomain);
      return;
    }

    const previousQuantity = await this.inventoryService.updateInventoryLevel(
      variant.id,
      brand.id,
      available,
    );

    const delta = available - previousQuantity;
    if (delta !== 0) {
      await this.inventoryService.recordStockMovement({
        variantId: variant.id,
        brandId: brand.id,
        delta,
        previousQuantity,
        newQuantity: available,
        source: 'webhook',
        reason: 'Inventory sync from Shopify webhook',
      });
    }

    await this.storeEvent(eventHash, 'inventory_levels/update', inventoryItemId, brand.id, payload, shopDomain);
  }

  private async upsertShopifyOrder(brandId: string, payload: any): Promise<void> {
    const orderId = payload.id?.toString();
    if (!orderId) return;

    const customerId = payload.customer?.id?.toString() || null;
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];
    const orderPayload = {
      brand_id: brandId,
      shopify_order_id: orderId,
      customer_shopify_id: customerId,
      order_name: payload.name || null,
      order_number: toNumber(payload.order_number),
      email: payload.email || payload.customer?.email || null,
      financial_status: payload.financial_status || payload.display_financial_status || null,
      fulfillment_status: payload.fulfillment_status || payload.display_fulfillment_status || null,
      currency: payload.currency || payload.presentment_currency || null,
      subtotal_price: toNumber(payload.subtotal_price),
      total_tax: toNumber(payload.total_tax),
      total_discounts: toNumber(payload.total_discounts),
      total_price: toNumber(payload.total_price),
      current_total_price: toNumber(payload.current_total_price),
      tags: Array.isArray(payload.tags) ? payload.tags.join(',') : payload.tags || null,
      note: payload.note || null,
      line_items_count: lineItems.length,
      processed_at: payload.processed_at || null,
      cancelled_at: payload.cancelled_at || null,
      closed_at: payload.closed_at || null,
      created_at_shopify: payload.created_at || null,
      updated_at_shopify: payload.updated_at || null,
      payload,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('shopify_orders')
      .upsert(orderPayload, { onConflict: 'brand_id,shopify_order_id' });

    if (error && !isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  private async upsertShopifyCustomer(brandId: string, payload: any): Promise<void> {
    const customerId = payload.id?.toString();
    if (!customerId) return;

    const customerPayload = {
      brand_id: brandId,
      shopify_customer_id: customerId,
      email: payload.email || null,
      phone: payload.phone || null,
      first_name: payload.first_name || payload.firstName || null,
      last_name: payload.last_name || payload.lastName || null,
      state: payload.state || null,
      tags: Array.isArray(payload.tags) ? payload.tags.join(',') : payload.tags || null,
      accepts_marketing:
        typeof payload.accepts_marketing === 'boolean'
          ? payload.accepts_marketing
          : Boolean(payload.acceptsMarketing),
      number_of_orders: toNumber(payload.orders_count ?? payload.number_of_orders),
      total_spent: toNumber(payload.total_spent),
      currency: payload.currency || null,
      created_at_shopify: payload.created_at || null,
      updated_at_shopify: payload.updated_at || null,
      payload,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('shopify_customers')
      .upsert(customerPayload, { onConflict: 'brand_id,shopify_customer_id' });

    if (error && !isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  // Handle order create/update
  private async handleOrderUpsert(
    payload: any,
    brand: any,
    eventHash: string,
    topic: string,
    shopDomain: string,
    adjustInventory: boolean,
  ): Promise<void> {
    const orderId = payload.id?.toString() || '';
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

    if (adjustInventory) {
      for (const item of lineItems) {
        const variantId = item.variant_id?.toString();
        const quantity = Number(item.quantity || 0);
        if (!variantId || !Number.isFinite(quantity) || quantity <= 0) continue;

        const variant = await this.findVariantByShopifyIdentifiers(brand.id, variantId, null);
        if (!variant) continue;

        const { data: inventory } = await supabase
          .from('inventory_levels')
          .select('available')
          .eq('variant_id', variant.id)
          .maybeSingle();

        const previousQuantity = inventory?.available || 0;
        const newQuantity = Math.max(0, previousQuantity - quantity);

        await this.inventoryService.updateInventoryLevel(variant.id, brand.id, newQuantity);

        await this.inventoryService.recordStockMovement({
          variantId: variant.id,
          brandId: brand.id,
          delta: -quantity,
          previousQuantity,
          newQuantity,
          source: 'order',
          reason: `Order #${payload.order_number || orderId}`,
          referenceId: orderId,
        });
      }
    }

    await this.upsertShopifyOrder(brand.id, payload);
    if (payload.customer) {
      await this.upsertShopifyCustomer(brand.id, payload.customer);
    }
    await this.storeEvent(eventHash, topic, orderId, brand.id, payload, shopDomain);
  }

  // Handle order cancellation
  private async handleOrderCancel(
    payload: any,
    brand: any,
    eventHash: string,
    shopDomain: string,
  ): Promise<void> {
    const orderId = payload.id?.toString() || '';
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];

    for (const item of lineItems) {
      const variantId = item.variant_id?.toString();
      const quantity = Number(item.quantity || 0);
      if (!variantId || !Number.isFinite(quantity) || quantity <= 0) continue;

      const variant = await this.findVariantByShopifyIdentifiers(brand.id, variantId, null);
      if (!variant) continue;

      const { data: inventory } = await supabase
        .from('inventory_levels')
        .select('available')
        .eq('variant_id', variant.id)
        .maybeSingle();

      const previousQuantity = inventory?.available || 0;
      const newQuantity = previousQuantity + quantity;

      await this.inventoryService.updateInventoryLevel(variant.id, brand.id, newQuantity);

      await this.inventoryService.recordStockMovement({
        variantId: variant.id,
        brandId: brand.id,
        delta: quantity,
        previousQuantity,
        newQuantity,
        source: 'order',
        reason: `Order cancelled #${payload.order_number || orderId}`,
        referenceId: orderId,
      });
    }

    await this.upsertShopifyOrder(brand.id, payload);
    await this.storeEvent(eventHash, 'orders/cancelled', orderId, brand.id, payload, shopDomain);
  }

  // Handle refund
  private async handleRefundCreate(
    payload: any,
    brand: any,
    eventHash: string,
    shopDomain: string,
  ): Promise<void> {
    const refundId = payload.id?.toString() || '';
    const refundLineItems = Array.isArray(payload.refund_line_items) ? payload.refund_line_items : [];

    for (const item of refundLineItems) {
      const lineItem = item.line_item;
      const variantId = lineItem?.variant_id?.toString();
      const quantity = Number(item.quantity || 0);
      const restockType = item.restock_type;

      if (!variantId || restockType !== 'return' || !Number.isFinite(quantity) || quantity <= 0) continue;

      const variant = await this.findVariantByShopifyIdentifiers(brand.id, variantId, null);
      if (!variant) continue;

      const { data: inventory } = await supabase
        .from('inventory_levels')
        .select('available')
        .eq('variant_id', variant.id)
        .maybeSingle();

      const previousQuantity = inventory?.available || 0;
      const newQuantity = previousQuantity + quantity;

      await this.inventoryService.updateInventoryLevel(variant.id, brand.id, newQuantity);

      await this.inventoryService.recordStockMovement({
        variantId: variant.id,
        brandId: brand.id,
        delta: quantity,
        previousQuantity,
        newQuantity,
        source: 'refund',
        reason: `Refund #${refundId}`,
        referenceId: refundId,
      });
    }

    await this.storeEvent(eventHash, 'refunds/create', refundId, brand.id, payload, shopDomain);
  }

  // Handle product create/update
  private async handleProductUpsert(
    payload: any,
    brand: any,
    eventHash: string,
    topic: string,
    shopDomain: string,
  ): Promise<void> {
    const productId = payload.id?.toString() || extractShopifyId(payload.admin_graphql_api_id);
    if (!productId) {
      await this.storeEvent(eventHash, topic, '', brand.id, payload, shopDomain);
      return;
    }

    await this.inventoryService.syncProduct(brand.id, productId);
    await this.storeEvent(eventHash, topic, productId, brand.id, payload, shopDomain);
  }

  // Handle product delete
  private async handleProductDelete(
    payload: any,
    brand: any,
    eventHash: string,
    shopDomain: string,
  ): Promise<void> {
    const productId = payload.id?.toString() || extractShopifyId(payload.admin_graphql_api_id);
    if (!productId) {
      await this.storeEvent(eventHash, 'products/delete', '', brand.id, payload, shopDomain);
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('brand_id', brand.id)
      .eq('shopify_product_id', productId);

    if (error) {
      throw error;
    }

    await this.storeEvent(eventHash, 'products/delete', productId, brand.id, payload, shopDomain);
  }

  // Handle customer create/update
  private async handleCustomerUpsert(
    payload: any,
    brand: any,
    eventHash: string,
    topic: string,
    shopDomain: string,
  ): Promise<void> {
    const customerId = payload.id?.toString() || '';
    await this.upsertShopifyCustomer(brand.id, payload);
    await this.storeEvent(eventHash, topic, customerId, brand.id, payload, shopDomain);
  }

  // Handle customer delete
  private async handleCustomerDelete(
    payload: any,
    brand: any,
    eventHash: string,
    shopDomain: string,
  ): Promise<void> {
    const customerId = payload.id?.toString() || '';
    if (customerId) {
      const { error } = await supabase
        .from('shopify_customers')
        .delete()
        .eq('brand_id', brand.id)
        .eq('shopify_customer_id', customerId);

      if (error && !isSchemaCompatibilityError(error)) {
        throw error;
      }
    }

    await this.storeEvent(eventHash, 'customers/delete', customerId, brand.id, payload, shopDomain);
  }
}
