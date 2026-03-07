import { supabase } from "../config/supabase";
import { getShopifyConfig } from "../config/shopify";
import { logger } from "../utils/logger";
import { ShopifyService } from "./shopify";

export interface ShopifyFullSyncSummary {
  brand_id: string;
  store_id: string;
  products: number;
  variants: number;
  inventory_levels: number;
  customers: number;
  orders: number;
  wiped_existing_data: boolean;
  synced_at: string;
}

function extractShopifyId(value: unknown): string {
  if (!value) return "";
  const parts = String(value).split("/");
  return parts[parts.length - 1] || "";
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isSchemaCompatibilityError(error: any): boolean {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
  return (
    text.includes("column") ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("unknown relationship") ||
    text.includes("on conflict")
  );
}

function resolveTenantId(storeIdOrBrandId: string): string {
  return String(storeIdOrBrandId || "").trim();
}

async function upsertTenantScoped(params: {
  table: string;
  tenantId: string;
  payload: Record<string, unknown>;
  modernConflict: string;
  legacyConflict: string;
}): Promise<void> {
  const modern = await supabase
    .from(params.table)
    .upsert({ ...params.payload, store_id: params.tenantId }, { onConflict: params.modernConflict });
  if (!modern.error) return;

  if (!isSchemaCompatibilityError(modern.error)) {
    throw modern.error;
  }

  const legacy = await supabase
    .from(params.table)
    .upsert({ ...params.payload, brand_id: params.tenantId }, { onConflict: params.legacyConflict });
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
        .select("id")
        .single(),
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.minimalPayload, store_id: params.tenantId }, { onConflict: params.modernConflict })
        .select("id")
        .single(),
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.fullPayload, brand_id: params.tenantId }, { onConflict: params.legacyConflict })
        .select("id")
        .single(),
    () =>
      supabase
        .from(params.table)
        .upsert({ ...params.minimalPayload, brand_id: params.tenantId }, { onConflict: params.legacyConflict })
        .select("id")
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

async function deleteByTenantScope(table: string, tenantId: string): Promise<void> {
  const modern = await supabase.from(table).delete().eq("store_id", tenantId);
  if (!modern.error) return;

  if (!isSchemaCompatibilityError(modern.error)) {
    throw modern.error;
  }

  const legacy = await supabase.from(table).delete().eq("brand_id", tenantId);
  if (legacy.error && !isSchemaCompatibilityError(legacy.error)) {
    throw legacy.error;
  }
}

export class ShopifySyncService {
  async syncBrand(
    brandId: string,
    options?: { wipeExistingData?: boolean },
  ): Promise<ShopifyFullSyncSummary> {
    const storeId = resolveTenantId(brandId);
    const wipeExistingData = options?.wipeExistingData !== false;
    
    try {
      const brand = await this.getBrandOrThrow(storeId);
      
      // Validate Shopify configuration
      if (!brand.shopify_domain && !brand.access_token && !brand.shopify_access_token) {
        throw new Error("Brand is not connected to Shopify. Please connect your Shopify store first.");
      }

      await this.updateBrandSyncState(storeId, {
        sync_status: "syncing",
        last_sync_error: null,
      });

      await this.ensureOperationalTables();

      const shopifyConfig = getShopifyConfig(String(brand.name || ""), {
        domain: String(brand.shopify_domain || ""),
        accessToken: String(brand.shopify_access_token || ""),
        legacyAccessToken: String(brand.access_token || ""),
        locationId: String(brand.shopify_location_id || ""),
      });
      const shopify = new ShopifyService(shopifyConfig);

      if (wipeExistingData) {
        await this.wipeBrandData(storeId);
      }

      const products = await shopify.syncAllProducts();
      const customers = await shopify.syncAllCustomers();
      const orders = await shopify.syncAllOrders();

      let productsCount = 0;
      let variantsCount = 0;
      let inventoryLevelsCount = 0;

      for (const product of products) {
        const dbProductId = await this.upsertProduct(storeId, product);
        productsCount += 1;

        for (const edge of product?.variants?.edges || []) {
          const variant = edge?.node;
          if (!variant) continue;

          const dbVariantId = await this.upsertVariant(storeId, dbProductId, variant);
          variantsCount += 1;

          const inventoryQuantity = Number.isFinite(Number(variant.inventoryQuantity))
            ? Number(variant.inventoryQuantity)
            : 0;

          await upsertTenantScoped({
            table: "inventory_levels",
            tenantId: storeId,
            payload: {
              variant_id: dbVariantId,
              available: inventoryQuantity,
            },
            modernConflict: "variant_id",
            legacyConflict: "variant_id",
          });

          inventoryLevelsCount += 1;
        }
      }

      let customersCount = 0;
      for (const customer of customers) {
        const shopifyCustomerId = extractShopifyId(customer.id);
        if (!shopifyCustomerId) continue;

        const payload = {
          shopify_customer_id: shopifyCustomerId,
          email: customer.email || null,
          phone: customer.phone || null,
          first_name: customer.firstName || null,
          last_name: customer.lastName || null,
          state: customer.state || null,
          tags: Array.isArray(customer.tags) ? customer.tags.join(",") : customer.tags || null,
          accepts_marketing: Boolean(customer.acceptsMarketing),
          number_of_orders: toNumber(customer.numberOfOrders),
          total_spent: toNumber(customer.totalSpentV2?.amount),
          currency: customer.totalSpentV2?.currencyCode || null,
          created_at_shopify: customer.createdAt || null,
          updated_at_shopify: customer.updatedAt || null,
          payload: customer,
          synced_at: new Date().toISOString(),
        };

        await upsertTenantScoped({
          table: "shopify_customers",
          tenantId: storeId,
          payload,
          modernConflict: "store_id,shopify_customer_id",
          legacyConflict: "brand_id,shopify_customer_id",
        });

        customersCount += 1;
      }

      let ordersCount = 0;
      for (const order of orders) {
        const shopifyOrderId = extractShopifyId(order.id);
        if (!shopifyOrderId) continue;

        const lineItemsCount = Array.isArray(order?.lineItems?.edges) ? order.lineItems.edges.length : 0;
        const shopMoney =
          order.currentTotalPriceSet?.shopMoney ||
          order.totalPriceSet?.shopMoney ||
          order.subtotalPriceSet?.shopMoney ||
          null;

        const payload = {
          shopify_order_id: shopifyOrderId,
          customer_shopify_id: extractShopifyId(order.customer?.id) || null,
          order_name: order.name || null,
          order_number: toNumber(order.orderNumber),
          email: order.email || order.customer?.email || null,
          financial_status: order.displayFinancialStatus || null,
          fulfillment_status: order.displayFulfillmentStatus || null,
          currency: shopMoney?.currencyCode || null,
          subtotal_price: toNumber(order.subtotalPriceSet?.shopMoney?.amount),
          total_tax: toNumber(order.totalTaxSet?.shopMoney?.amount),
          total_discounts: toNumber(order.totalDiscountsSet?.shopMoney?.amount),
          total_price: toNumber(order.totalPriceSet?.shopMoney?.amount),
          current_total_price: toNumber(order.currentTotalPriceSet?.shopMoney?.amount),
          tags: Array.isArray(order.tags) ? order.tags.join(",") : order.tags || null,
          note: order.note || null,
          line_items_count: lineItemsCount,
          processed_at: order.processedAt || null,
          cancelled_at: order.cancelledAt || null,
          closed_at: order.closedAt || null,
          created_at_shopify: order.createdAt || null,
          updated_at_shopify: order.updatedAt || null,
          payload: order,
          synced_at: new Date().toISOString(),
        };

        await upsertTenantScoped({
          table: "shopify_orders",
          tenantId: storeId,
          payload,
          modernConflict: "store_id,shopify_order_id",
          legacyConflict: "brand_id,shopify_order_id",
        });

        ordersCount += 1;
      }

      await this.updateBrandSyncState(storeId, {
        last_sync_at: new Date().toISOString(),
        sync_status: "idle",
        last_sync_error: null,
      });

      const summary: ShopifyFullSyncSummary = {
        brand_id: storeId,
        store_id: storeId,
        products: productsCount,
        variants: variantsCount,
        inventory_levels: inventoryLevelsCount,
        customers: customersCount,
        orders: ordersCount,
        wiped_existing_data: wipeExistingData,
        synced_at: new Date().toISOString(),
      };

      logger.info("Shopify full sync completed", summary);
      return summary;
    } catch (error: any) {
      await this.updateBrandSyncState(storeId, {
        sync_status: "error",
        last_sync_error: error?.message || "Unknown sync error",
      });
      throw error;
    }
  }

  private async getBrandOrThrow(storeId: string): Promise<Record<string, any>> {
    const { data, error } = await supabase.from("brands").select("*").eq("id", storeId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Brand not found");
    return data as Record<string, any>;
  }

  private async updateBrandSyncState(
    storeId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from("brands").update(updates).eq("id", storeId);
    if (error && !isSchemaCompatibilityError(error)) {
      throw error;
    }
  }

  private async upsertProduct(storeId: string, product: any): Promise<string> {
    const shopifyProductId = extractShopifyId(product.id);
    if (!shopifyProductId) {
      throw new Error("Invalid Shopify product id");
    }

    const fullPayload = {
      shopify_product_id: shopifyProductId,
      title: product.title || "",
      handle: product.handle || null,
      product_type: product.productType || null,
      vendor: product.vendor || null,
      status: product.status || null,
      shopify_payload: product,
    };

    const minimalPayload = {
      shopify_product_id: shopifyProductId,
      title: product.title || "",
      handle: product.handle || null,
      product_type: product.productType || null,
      vendor: product.vendor || null,
      status: product.status || null,
    };

    return upsertEntityIdWithTenantFallback({
      table: "products",
      tenantId: storeId,
      fullPayload,
      minimalPayload,
      modernConflict: "store_id,shopify_product_id",
      legacyConflict: "brand_id,shopify_product_id",
    });
  }

  private async upsertVariant(storeId: string, productId: string, variant: any): Promise<string> {
    const shopifyVariantId = extractShopifyId(variant.id);
    if (!shopifyVariantId) {
      throw new Error("Invalid Shopify variant id");
    }

    const selectedOptions = Array.isArray(variant.selectedOptions) ? variant.selectedOptions : [];
    const option1 = selectedOptions[0]?.value || null;
    const option2 = selectedOptions[1]?.value || null;
    const option3 = selectedOptions[2]?.value || null;

    const fullPayload = {
      product_id: productId,
      shopify_variant_id: shopifyVariantId,
      title: variant.title || null,
      sku: variant.sku || null,
      barcode: variant.barcode || null,
      price: toNumber(variant.price),
      compare_at_price: toNumber(variant.compareAtPrice),
      position: toNumber(variant.position),
      option1,
      option2,
      option3,
      inventory_item_id: extractShopifyId(variant.inventoryItem?.id) || null,
      inventory_quantity: toNumber(variant.inventoryQuantity),
      shopify_payload: variant,
    };

    const minimalPayload = {
      product_id: productId,
      shopify_variant_id: shopifyVariantId,
      title: variant.title || null,
      sku: variant.sku || null,
      barcode: variant.barcode || null,
      price: toNumber(variant.price),
      compare_at_price: toNumber(variant.compareAtPrice),
      position: toNumber(variant.position),
      option1,
      option2,
      option3,
    };

    return upsertEntityIdWithTenantFallback({
      table: "variants",
      tenantId: storeId,
      fullPayload,
      minimalPayload,
      modernConflict: "store_id,shopify_variant_id",
      legacyConflict: "brand_id,shopify_variant_id",
    });
  }

  private async wipeBrandData(storeId: string): Promise<void> {
    const orderedDeletes = [
      "shopify_orders",
      "shopify_customers",
      "inventory_levels",
      "variants",
      "products",
    ];

    for (const table of orderedDeletes) {
      await deleteByTenantScope(table, storeId);
    }
  }

  private async ensureOperationalTables(): Promise<void> {
    for (const table of ["shopify_customers", "shopify_orders"]) {
      const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
      if (!error) continue;

      if (isSchemaCompatibilityError(error)) {
        throw new Error(
          `Missing required table "${table}". Run migration 016_single_store_and_shopify_data.sql`,
        );
      }

      throw error;
    }
  }
}
