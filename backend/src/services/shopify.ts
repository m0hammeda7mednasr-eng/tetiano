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
          tags
          createdAt
          updatedAt
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                position
                selectedOptions {
                  name
                  value
                }
                inventoryQuantity
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
              tags
              createdAt
              updatedAt
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    barcode
                    price
                    compareAtPrice
                    position
                    selectedOptions {
                      name
                      value
                    }
                    inventoryQuantity
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

  // Sync all customers with pagination
  async syncAllCustomers() {
    const query = `
      query getCustomers($cursor: String) {
        customers(first: 50, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              state
              tags
              acceptsMarketing
              numberOfOrders
              totalSpentV2 {
                amount
                currencyCode
              }
              defaultAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const customers = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result: any = await this.graphql(query, { cursor });
      customers.push(...result.customers.edges.map((e: any) => e.node));
      hasNextPage = result.customers.pageInfo.hasNextPage;
      cursor = result.customers.pageInfo.endCursor;
    }

    return customers;
  }

  // Sync all orders with details and pagination
  async syncAllOrders() {
    const query = `
      query getOrders($cursor: String) {
        orders(first: 50, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
              orderNumber
              email
              createdAt
              updatedAt
              processedAt
              cancelledAt
              closedAt
              displayFinancialStatus
              displayFulfillmentStatus
              tags
              note
              customer {
                id
                firstName
                lastName
                email
                phone
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalDiscountsSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              currentTotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              billingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              shippingAddress {
                address1
                address2
                city
                province
                country
                zip
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    quantity
                    variant {
                      id
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      productType
                      status
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const orders = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result: any = await this.graphql(query, { cursor });
      orders.push(...result.orders.edges.map((e: any) => e.node));
      hasNextPage = result.orders.pageInfo.hasNextPage;
      cursor = result.orders.pageInfo.endCursor;
    }

    return orders;
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
                id
                firstName
                lastName
                email
                phone
              }
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    sku
                    variant {
                      id
                    }
                    product {
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

    const result = await this.graphql(query, { limit });
    return result.orders.edges.map((e: any) => e.node);
  }
}
