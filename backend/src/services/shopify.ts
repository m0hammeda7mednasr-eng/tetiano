import axios, { AxiosInstance } from 'axios';
import { ShopifyConfig, SHOPIFY_API_VERSION } from '../config/shopify';
import { logger } from '../utils/logger';

export class ShopifyService {
  private client: AxiosInstance;
  private config: ShopifyConfig;

  constructor(config: ShopifyConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.domain}/admin/api/${SHOPIFY_API_VERSION}`,
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  // GraphQL query helper
  async graphql<T = any>(query: string, variables?: any): Promise<T> {
    try {
      const response = await this.client.post('/graphql.json', {
        query,
        variables,
      });

      if (response.data.errors) {
        logger.error('Shopify GraphQL errors', { errors: response.data.errors });
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error: any) {
      logger.error('Shopify GraphQL request failed', {
        error: error.message,
        query,
        variables,
      });
      throw error;
    }
  }

  // Adjust inventory at location
  async adjustInventory(
    inventoryItemId: string,
    availableDelta: number,
    reason?: string
  ): Promise<void> {
    const mutation = `
      mutation inventoryAdjustQuantity($input: InventoryAdjustQuantityInput!) {
        inventoryAdjustQuantity(input: $input) {
          inventoryLevel {
            id
            available
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        inventoryLevelId: `gid://shopify/InventoryLevel/${inventoryItemId}?inventory_item_id=${inventoryItemId}&location_id=${this.config.locationId}`,
        availableDelta,
        reason: reason || 'Manual adjustment',
      },
    };

    const result = await this.graphql(mutation, variables);

    if (result.inventoryAdjustQuantity?.userErrors?.length > 0) {
      throw new Error(
        `Inventory adjustment failed: ${JSON.stringify(
          result.inventoryAdjustQuantity.userErrors
        )}`
      );
    }

    logger.info('Inventory adjusted', {
      inventoryItemId,
      availableDelta,
      reason,
    });
  }

  // Set inventory level
  async setInventory(
    inventoryItemId: string,
    available: number
  ): Promise<void> {
    const mutation = `
      mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        reason: 'correction',
        quantities: [
          {
            inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
            locationId: `gid://shopify/Location/${this.config.locationId}`,
            quantity: available,
          },
        ],
      },
    };

    const result = await this.graphql(mutation, variables);

    if (result.inventorySetQuantities?.userErrors?.length > 0) {
      throw new Error(
        `Inventory set failed: ${JSON.stringify(
          result.inventorySetQuantities.userErrors
        )}`
      );
    }

    logger.info('Inventory set', { inventoryItemId, available });
  }

  // Get product with variants
  async getProduct(productId: string) {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          productType
          vendor
          status
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                inventoryItem {
                  id
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, {
      id: `gid://shopify/Product/${productId}`,
    });

    return result.product;
  }

  // Get inventory level
  async getInventoryLevel(inventoryItemId: string) {
    const query = `
      query getInventoryLevel($id: ID!) {
        inventoryItem(id: $id) {
          id
          inventoryLevel(locationId: "${this.config.locationId}") {
            available
          }
        }
      }
    `;

    const result = await this.graphql(query, {
      id: `gid://shopify/InventoryItem/${inventoryItemId}`,
    });

    return result.inventoryItem?.inventoryLevel;
  }

  // Sync all products
  async syncAllProducts() {
    const query = `
      query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              productType
              vendor
              status
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    barcode
                    price
                    compareAtPrice
                    inventoryItem {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const products = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result: any = await this.graphql(query, { cursor });
      products.push(...result.products.edges.map((e: any) => e.node));
      hasNextPage = result.products.pageInfo.hasNextPage;
      cursor = result.products.pageInfo.endCursor;
    }

    return products;
  }

  // Get recent orders
  async getRecentOrders(limit: number = 20) {
    const query = `
      query getOrders($limit: Int) {
        orders(first: $limit, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              customer {
                firstName
                lastName
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { limit });
    return result.orders.edges.map((e: any) => e.node);
  }
}
