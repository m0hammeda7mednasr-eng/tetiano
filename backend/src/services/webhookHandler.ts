import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { InventoryService } from './inventory';
import { logger } from '../utils/logger';

export class WebhookHandler {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  // Check if event already processed (idempotency)
  private async isEventProcessed(eventHash: string): Promise<boolean> {
    const { data } = await supabase
      .from('shopify_webhook_events')
      .select('id')
      .eq('event_hash', eventHash)
      .eq('processed', true)
      .single();

    return !!data;
  }

  // Store webhook event
  private async storeEvent(
    eventHash: string,
    topic: string,
    shopifyId: string,
    brandId: string,
    payload: any
  ): Promise<void> {
    await supabase.from('shopify_webhook_events').insert({
      event_hash: eventHash,
      topic,
      shopify_id: shopifyId,
      brand_id: brandId,
      payload,
      processed: true,
    });
  }

  // Get brand by shop domain
  private async getBrandByDomain(shopDomain: string): Promise<any> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('shopify_domain', shopDomain)
      .single();

    if (error) {
      logger.error('Brand not found for domain', { shopDomain, error });
      throw new Error(`Brand not found: ${shopDomain}`);
    }

    return data;
  }

  // Main handler
  async handle(topic: string, payload: any, shopDomain: string): Promise<void> {
    try {
      // Create event hash for idempotency
      const eventHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(payload) + topic + shopDomain)
        .digest('hex');

      // Check if already processed
      if (await this.isEventProcessed(eventHash)) {
        logger.info('Event already processed, skipping', { eventHash, topic });
        return;
      }

      // Get brand
      const brand = await this.getBrandByDomain(shopDomain);

      // Route to appropriate handler
      switch (topic) {
        case 'inventory_levels/update':
          await this.handleInventoryUpdate(payload, brand, eventHash);
          break;
        case 'orders/create':
        case 'orders/paid':
          await this.handleOrderCreate(payload, brand, eventHash);
          break;
        case 'orders/cancelled':
          await this.handleOrderCancel(payload, brand, eventHash);
          break;
        case 'refunds/create':
          await this.handleRefundCreate(payload, brand, eventHash);
          break;
        case 'products/update':
          await this.handleProductUpdate(payload, brand, eventHash);
          break;
        default:
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

  // Handle inventory level update
  private async handleInventoryUpdate(
    payload: any,
    brand: any,
    eventHash: string
  ): Promise<void> {
    const inventoryItemId = payload.inventory_item_id?.toString();
    const available = payload.available;

    // Find variant
    const { data: variant } = await supabase
      .from('variants')
      .select('id')
      .eq('brand_id', brand.id)
      .eq('shopify_variant_id', inventoryItemId)
      .single();

    if (!variant) {
      logger.warn('Variant not found for inventory update', { inventoryItemId });
      return;
    }

    // Get current quantity
    const previousQuantity = await this.inventoryService.updateInventoryLevel(
      variant.id,
      brand.id,
      available
    );

    // Record movement
    await this.inventoryService.recordStockMovement({
      variantId: variant.id,
      brandId: brand.id,
      delta: available - previousQuantity,
      previousQuantity,
      newQuantity: available,
      source: 'webhook',
      reason: 'Inventory sync from Shopify',
    });

    // Store event
    await this.storeEvent(eventHash, 'inventory_levels/update', inventoryItemId, brand.id, payload);
  }

  // Handle order creation
  private async handleOrderCreate(
    payload: any,
    brand: any,
    eventHash: string
  ): Promise<void> {
    const orderId = payload.id?.toString();
    const lineItems = payload.line_items || [];

    for (const item of lineItems) {
      const variantId = item.variant_id?.toString();
      const quantity = item.quantity;

      if (!variantId) continue;

      // Find variant
      const { data: variant } = await supabase
        .from('variants')
        .select('id')
        .eq('brand_id', brand.id)
        .eq('shopify_variant_id', variantId)
        .single();

      if (!variant) continue;

      // Get current inventory
      const { data: inventory } = await supabase
        .from('inventory_levels')
        .select('available')
        .eq('variant_id', variant.id)
        .single();

      const previousQuantity = inventory?.available || 0;
      const newQuantity = Math.max(0, previousQuantity - quantity);

      // Update inventory
      await this.inventoryService.updateInventoryLevel(
        variant.id,
        brand.id,
        newQuantity
      );

      // Record movement
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

    // Store event
    await this.storeEvent(eventHash, 'orders/create', orderId, brand.id, payload);
  }

  // Handle order cancellation
  private async handleOrderCancel(
    payload: any,
    brand: any,
    eventHash: string
  ): Promise<void> {
    const orderId = payload.id?.toString();
    const lineItems = payload.line_items || [];

    for (const item of lineItems) {
      const variantId = item.variant_id?.toString();
      const quantity = item.quantity;

      if (!variantId) continue;

      const { data: variant } = await supabase
        .from('variants')
        .select('id')
        .eq('brand_id', brand.id)
        .eq('shopify_variant_id', variantId)
        .single();

      if (!variant) continue;

      const { data: inventory } = await supabase
        .from('inventory_levels')
        .select('available')
        .eq('variant_id', variant.id)
        .single();

      const previousQuantity = inventory?.available || 0;
      const newQuantity = previousQuantity + quantity;

      await this.inventoryService.updateInventoryLevel(
        variant.id,
        brand.id,
        newQuantity
      );

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

    await this.storeEvent(eventHash, 'orders/cancelled', orderId, brand.id, payload);
  }

  // Handle refund
  private async handleRefundCreate(
    payload: any,
    brand: any,
    eventHash: string
  ): Promise<void> {
    const refundId = payload.id?.toString();
    const refundLineItems = payload.refund_line_items || [];

    for (const item of refundLineItems) {
      const lineItem = item.line_item;
      const variantId = lineItem?.variant_id?.toString();
      const quantity = item.quantity;
      const restockType = item.restock_type;

      if (!variantId || restockType !== 'return') continue;

      const { data: variant } = await supabase
        .from('variants')
        .select('id')
        .eq('brand_id', brand.id)
        .eq('shopify_variant_id', variantId)
        .single();

      if (!variant) continue;

      const { data: inventory } = await supabase
        .from('inventory_levels')
        .select('available')
        .eq('variant_id', variant.id)
        .single();

      const previousQuantity = inventory?.available || 0;
      const newQuantity = previousQuantity + quantity;

      await this.inventoryService.updateInventoryLevel(
        variant.id,
        brand.id,
        newQuantity
      );

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

    await this.storeEvent(eventHash, 'refunds/create', refundId, brand.id, payload);
  }

  // Handle product update
  private async handleProductUpdate(
    payload: any,
    brand: any,
    eventHash: string
  ): Promise<void> {
    const productId = payload.id?.toString();

    // Sync product
    await this.inventoryService.syncProduct(brand.id, productId);

    await this.storeEvent(eventHash, 'products/update', productId, brand.id, payload);
  }
}
