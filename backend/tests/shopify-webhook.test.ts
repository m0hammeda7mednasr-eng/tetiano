/**
 * Shopify Webhook Integration Tests
 * Tests webhook receiving, validation, and processing
 */

import axios from "axios";
import crypto from "crypto";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || "test-secret";

interface WebhookTestResult {
  test: string;
  status: "PASS" | "FAIL";
  message?: string;
}

class ShopifyWebhookTester {
  private results: WebhookTestResult[] = [];

  private generateHmac(body: string, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
  }

  private async sendWebhook(params: {
    topic: string;
    shop: string;
    payload: any;
    secret?: string;
    invalidHmac?: boolean;
  }): Promise<any> {
    const body = JSON.stringify(params.payload);
    const secret = params.secret || WEBHOOK_SECRET;
    const hmac = params.invalidHmac
      ? "invalid-hmac-signature"
      : this.generateHmac(body, secret);

    const response = await axios.post(
      `${BACKEND_URL}/api/webhooks/shopify`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Topic": params.topic,
          "X-Shopify-Shop-Domain": params.shop,
          "X-Shopify-Hmac-Sha256": hmac,
          "X-Shopify-Webhook-Id": `test-${Date.now()}-${Math.random()}`,
        },
        validateStatus: () => true,
      },
    );

    return response;
  }

  async testProductCreateWebhook(): Promise<void> {
    try {
      const payload = {
        id: 123456789,
        title: "Test Product",
        vendor: "Test Vendor",
        product_type: "Test Type",
        handle: "test-product",
        status: "active",
        variants: [
          {
            id: 987654321,
            title: "Default Title",
            sku: "TEST-SKU-001",
            price: "99.99",
            inventory_quantity: 10,
          },
        ],
      };

      const response = await this.sendWebhook({
        topic: "products/create",
        shop: "test-store.myshopify.com",
        payload,
      });

      if (response.status === 200) {
        this.results.push({
          test: "Product Create Webhook",
          status: "PASS",
        });
        console.log("✅ Product Create Webhook");
      } else {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    } catch (error: any) {
      this.results.push({
        test: "Product Create Webhook",
        status: "FAIL",
        message: error.message,
      });
      console.error("❌ Product Create Webhook:", error.message);
    }
  }

  async testOrderCreateWebhook(): Promise<void> {
    try {
      const payload = {
        id: 123456789,
        order_number: 1001,
        name: "#1001",
        email: "customer@example.com",
        total_price: "199.99",
        currency: "USD",
        financial_status: "paid",
        fulfillment_status: null,
        line_items: [
          {
            id: 987654321,
            product_id: 123456789,
            variant_id: 987654321,
            title: "Test Product",
            quantity: 2,
            price: "99.99",
          },
        ],
        customer: {
          id: 555555555,
          email: "customer@example.com",
          first_name: "Test",
          last_name: "Customer",
        },
      };

      const response = await this.sendWebhook({
        topic: "orders/create",
        shop: "test-store.myshopify.com",
        payload,
      });

      if (response.status === 200) {
        this.results.push({
          test: "Order Create Webhook",
          status: "PASS",
        });
        console.log("✅ Order Create Webhook");
      } else {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    } catch (error: any) {
      this.results.push({
        test: "Order Create Webhook",
        status: "FAIL",
        message: error.message,
      });
      console.error("❌ Order Create Webhook:", error.message);
    }
  }

  async testInventoryUpdateWebhook(): Promise<void> {
    try {
      const payload = {
        inventory_item_id: 123456789,
        location_id: 987654321,
        available: 50,
      };

      const response = await this.sendWebhook({
        topic: "inventory_levels/update",
        shop: "test-store.myshopify.com",
        payload,
      });

      if (response.status === 200) {
        this.results.push({
          test: "Inventory Update Webhook",
          status: "PASS",
        });
        console.log("✅ Inventory Update Webhook");
      } else {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    } catch (error: any) {
      this.results.push({
        test: "Inventory Update Webhook",
        status: "FAIL",
        message: error.message,
      });
      console.error("❌ Inventory Update Webhook:", error.message);
    }
  }

  async testInvalidHmacRejection(): Promise<void> {
    try {
      const payload = { id: 123, title: "Test" };

      const response = await this.sendWebhook({
        topic: "products/create",
        shop: "test-store.myshopify.com",
        payload,
        invalidHmac: true,
      });

      if (response.status === 401) {
        this.results.push({
          test: "Invalid HMAC Rejection",
          status: "PASS",
        });
        console.log("✅ Invalid HMAC Rejection");
      } else {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    } catch (error: any) {
      this.results.push({
        test: "Invalid HMAC Rejection",
        status: "FAIL",
        message: error.message,
      });
      console.error("❌ Invalid HMAC Rejection:", error.message);
    }
  }

  async testDuplicateWebhookIdempotency(): Promise<void> {
    try {
      const payload = { id: Date.now(), title: "Duplicate Test" };
      const webhookId = `duplicate-test-${Date.now()}`;

      // Send first webhook
      const response1 = await axios.post(
        `${BACKEND_URL}/api/webhooks/shopify`,
        JSON.stringify(payload),
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Topic": "products/create",
            "X-Shopify-Shop-Domain": "test-store.myshopify.com",
            "X-Shopify-Hmac-Sha256": this.generateHmac(
              JSON.stringify(payload),
              WEBHOOK_SECRET,
            ),
            "X-Shopify-Webhook-Id": webhookId,
          },
          validateStatus: () => true,
        },
      );

      // Send duplicate webhook with same ID
      const response2 = await axios.post(
        `${BACKEND_URL}/api/webhooks/shopify`,
        JSON.stringify(payload),
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Topic": "products/create",
            "X-Shopify-Shop-Domain": "test-store.myshopify.com",
            "X-Shopify-Hmac-Sha256": this.generateHmac(
              JSON.stringify(payload),
              WEBHOOK_SECRET,
            ),
            "X-Shopify-Webhook-Id": webhookId,
          },
          validateStatus: () => true,
        },
      );

      if (
        response1.status === 200 &&
        response2.status === 200 &&
        response2.data.duplicate === true
      ) {
        this.results.push({
          test: "Duplicate Webhook Idempotency",
          status: "PASS",
        });
        console.log("✅ Duplicate Webhook Idempotency");
      } else {
        throw new Error(
          `Expected duplicate detection, got status1=${response1.status}, status2=${response2.status}`,
        );
      }
    } catch (error: any) {
      this.results.push({
        test: "Duplicate Webhook Idempotency",
        status: "FAIL",
        message: error.message,
      });
      console.error("❌ Duplicate Webhook Idempotency:", error.message);
    }
  }

  async testRateLimiting(): Promise<void> {
    try {
      // Send 10 webhooks rapidly
      const requests = Array(10)
        .fill(null)
        .map((_, i) =>
          this.sendWebhook({
            topic: "products/create",
            shop: "test-store.myshopify.com",
            payload: { id: Date.now() + i, title: `Rate Test ${i}` },
          }),
        );

      const responses = await Promise.all(requests);
      const allAccepted = responses.every((r) => r.status === 200);

      if (allAccepted) {
        this.results.push({
          test: "Webhook Rate Limiting",
          status: "PASS",
        });
        console.log("✅ Webhook Rate Limiting (within limits)");
      } else {
        throw new Error("Some webhooks were rejected");
      }
    } catch (error: any) {
      this.results.push({
        test: "Webhook Rate Limiting",
        status: "FAIL",
        message: error.message,
      });
      console.error("❌ Webhook Rate Limiting:", error.message);
    }
  }

  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Shopify Webhook Tests\n");
    console.log(`Backend URL: ${BACKEND_URL}\n`);

    await this.testProductCreateWebhook();
    await this.testOrderCreateWebhook();
    await this.testInventoryUpdateWebhook();
    await this.testInvalidHmacRejection();
    await this.testDuplicateWebhookIdempotency();
    await this.testRateLimiting();

    this.printResults();
  }

  printResults(): void {
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;

    console.log("\n" + "=".repeat(60));
    console.log("📊 WEBHOOK TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(
      `Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`,
    );
    console.log("=".repeat(60));

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((result) => {
          console.log(`  - ${result.test}: ${result.message}`);
        });
    }
  }
}

async function main() {
  const tester = new ShopifyWebhookTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main();
}

export { ShopifyWebhookTester };
