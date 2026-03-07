/**
 * Comprehensive Integration Tests
 * Tests all backend-frontend communication, Shopify integration, and database operations
 */

import axios, { AxiosInstance } from "axios";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌");
  console.error("   SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✅" : "❌");
  console.error("\nPlease set these in your .env file");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestUser {
  email: string;
  password: string;
  token?: string;
  userId?: string;
  storeId?: string;
}

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  details: Array<{
    test: string;
    status: "PASS" | "FAIL";
    message?: string;
    duration: number;
  }>;
}

class IntegrationTester {
  private results: TestResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: [],
  };

  private testUser: TestUser = {
    email: `test-${Date.now()}@example.com`,
    password: "TestPassword123!",
  };

  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BACKEND_URL,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  private async runTest(
    name: string,
    testFn: () => Promise<void>,
  ): Promise<void> {
    const startTime = Date.now();
    this.results.total++;

    try {
      await testFn();
      this.results.passed++;
      this.results.details.push({
        test: name,
        status: "PASS",
        duration: Date.now() - startTime,
      });
      console.log(`✅ ${name}`);
    } catch (error: any) {
      this.results.failed++;
      this.results.details.push({
        test: name,
        status: "FAIL",
        message: error.message,
        duration: Date.now() - startTime,
      });
      console.error(`❌ ${name}: ${error.message}`);
    }
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  // ==================== AUTHENTICATION TESTS ====================

  async testUserSignup(): Promise<void> {
    await this.runTest("User Signup", async () => {
      const { data, error } = await supabase.auth.signUp({
        email: this.testUser.email,
        password: this.testUser.password,
      });

      this.assert(!error, `Signup failed: ${error?.message}`);
      this.assert(!!data.user, "No user returned from signup");
      this.assert(!!data.session, "No session returned from signup");

      this.testUser.userId = data.user!.id;
      this.testUser.token = data.session!.access_token;
    });
  }

  async testUserLogin(): Promise<void> {
    await this.runTest("User Login", async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: this.testUser.email,
        password: this.testUser.password,
      });

      this.assert(!error, `Login failed: ${error?.message}`);
      this.assert(!!data.session, "No session returned from login");
      this.testUser.token = data.session!.access_token;
    });
  }

  // ==================== API ENDPOINT TESTS ====================

  async testGetMeWithoutStore(): Promise<void> {
    await this.runTest("GET /api/app/me (without store)", async () => {
      const response = await this.api.get("/api/app/me", {
        headers: { Authorization: `Bearer ${this.testUser.token}` },
      });

      this.assert(
        response.status === 200,
        `Expected 200, got ${response.status}`,
      );
      this.assert(!!response.data.user, "No user in response");
      this.assert(
        response.data.user.id === this.testUser.userId,
        "User ID mismatch",
      );
      this.assert(
        response.data.store === null,
        "Store should be null for new user",
      );
    });
  }

  async testShopifyStatusWithoutStore(): Promise<void> {
    await this.runTest(
      "GET /api/app/shopify/status (without store)",
      async () => {
        const response = await this.api.get("/api/app/shopify/status", {
          headers: { Authorization: `Bearer ${this.testUser.token}` },
        });

        this.assert(
          response.status === 200,
          `Expected 200, got ${response.status}`,
        );
        this.assert(
          response.data.status === "no_store",
          "Status should be no_store",
        );
        this.assert(
          response.data.connected === false,
          "Connected should be false",
        );
      },
    );
  }

  async testNotificationsWithoutStore(): Promise<void> {
    await this.runTest(
      "GET /api/app/notifications/unread-count (without store)",
      async () => {
        const response = await this.api.get(
          "/api/app/notifications/unread-count",
          {
            headers: { Authorization: `Bearer ${this.testUser.token}` },
          },
        );

        this.assert(
          response.status === 200,
          `Expected 200, got ${response.status}`,
        );
        this.assert(
          response.data.unread_count === 0,
          "Unread count should be 0",
        );
      },
    );
  }

  async testBootstrapStore(): Promise<void> {
    await this.runTest("POST /api/onboarding/bootstrap-store", async () => {
      const response = await this.api.post(
        "/api/onboarding/bootstrap-store",
        {
          store_name: `Test Store ${Date.now()}`,
          user_full_name: "Test User",
        },
        {
          headers: { Authorization: `Bearer ${this.testUser.token}` },
        },
      );

      this.assert(
        response.status === 200 || response.status === 201,
        `Expected 200/201, got ${response.status}: ${JSON.stringify(response.data)}`,
      );
      this.assert(!!response.data.store, "No store in response");
      this.assert(!!response.data.store.id, "No store ID in response");

      this.testUser.storeId = response.data.store.id;
    });
  }

  async testGetMeWithStore(): Promise<void> {
    await this.runTest("GET /api/app/me (with store)", async () => {
      const response = await this.api.get("/api/app/me", {
        headers: { Authorization: `Bearer ${this.testUser.token}` },
      });

      this.assert(
        response.status === 200,
        `Expected 200, got ${response.status}`,
      );
      this.assert(!!response.data.store, "Store should exist now");
      this.assert(
        response.data.store.id === this.testUser.storeId,
        "Store ID mismatch",
      );
    });
  }

  async testDashboardOverview(): Promise<void> {
    await this.runTest("GET /api/app/dashboard/overview", async () => {
      const response = await this.api.get("/api/app/dashboard/overview", {
        headers: { Authorization: `Bearer ${this.testUser.token}` },
      });

      this.assert(
        response.status === 200,
        `Expected 200, got ${response.status}`,
      );
      this.assert(!!response.data.overview, "No overview in response");
      this.assert(
        typeof response.data.overview.products_total === "number",
        "products_total should be a number",
      );
    });
  }

  async testGetProducts(): Promise<void> {
    await this.runTest("GET /api/app/products", async () => {
      const response = await this.api.get("/api/app/products?limit=10", {
        headers: { Authorization: `Bearer ${this.testUser.token}` },
      });

      this.assert(
        response.status === 200,
        `Expected 200, got ${response.status}`,
      );
      this.assert(
        Array.isArray(response.data.products),
        "Products should be an array",
      );
      this.assert(!!response.data.pagination, "No pagination in response");
    });
  }

  async testGetOrders(): Promise<void> {
    await this.runTest("GET /api/app/orders", async () => {
      const response = await this.api.get("/api/app/orders?limit=10", {
        headers: { Authorization: `Bearer ${this.testUser.token}` },
      });

      this.assert(
        response.status === 200,
        `Expected 200, got ${response.status}`,
      );
      this.assert(
        Array.isArray(response.data.orders),
        "Orders should be an array",
      );
    });
  }

  // ==================== SHOPIFY INTEGRATION TESTS ====================

  async testShopifyConnectValidation(): Promise<void> {
    await this.runTest(
      "POST /api/app/shopify/connect (validation)",
      async () => {
        const response = await this.api.post(
          "/api/app/shopify/connect",
          {
            shop: "",
            api_key: "",
            api_secret: "",
          },
          {
            headers: { Authorization: `Bearer ${this.testUser.token}` },
          },
        );

        this.assert(
          response.status === 400,
          `Expected 400 for invalid input, got ${response.status}`,
        );
        this.assert(
          response.data.error.includes("required"),
          "Should return validation error",
        );
      },
    );
  }

  async testShopifyStatus(): Promise<void> {
    await this.runTest("GET /api/app/shopify/status (with store)", async () => {
      const response = await this.api.get("/api/app/shopify/status", {
        headers: { Authorization: `Bearer ${this.testUser.token}` },
      });

      this.assert(
        response.status === 200,
        `Expected 200, got ${response.status}`,
      );
      this.assert(
        typeof response.data.connected === "boolean",
        "connected should be boolean",
      );
    });
  }

  // ==================== DATABASE TESTS ====================

  async testDatabaseConnection(): Promise<void> {
    await this.runTest("Database Connection", async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .limit(1);

      this.assert(!error, `Database query failed: ${error?.message}`);
      this.assert(Array.isArray(data), "Query should return array");
    });
  }

  async testStoreCreation(): Promise<void> {
    await this.runTest("Store Creation in Database", async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", this.testUser.storeId!)
        .single();

      this.assert(!error, `Store query failed: ${error?.message}`);
      this.assert(!!data, "Store not found in database");
      this.assert(data.id === this.testUser.storeId, "Store ID mismatch");
    });
  }

  async testStoreMembership(): Promise<void> {
    await this.runTest("Store Membership Creation", async () => {
      const { data, error } = await supabase
        .from("store_memberships")
        .select("*")
        .eq("user_id", this.testUser.userId!)
        .eq("store_id", this.testUser.storeId!)
        .single();

      this.assert(!error, `Membership query failed: ${error?.message}`);
      this.assert(!!data, "Membership not found");
      this.assert(data.store_role === "admin", "User should be admin");
      this.assert(data.status === "active", "Membership should be active");
    });
  }

  // ==================== ERROR HANDLING TESTS ====================

  async testUnauthorizedAccess(): Promise<void> {
    await this.runTest("Unauthorized Access", async () => {
      const response = await this.api.get("/api/app/me");

      this.assert(
        response.status === 401,
        `Expected 401, got ${response.status}`,
      );
    });
  }

  async testInvalidToken(): Promise<void> {
    await this.runTest("Invalid Token", async () => {
      const response = await this.api.get("/api/app/me", {
        headers: { Authorization: "Bearer invalid-token-12345" },
      });

      this.assert(
        response.status === 401,
        `Expected 401, got ${response.status}`,
      );
    });
  }

  async testCrossStoreAccess(): Promise<void> {
    await this.runTest("Cross-Store Access Prevention", async () => {
      // Try to access another store's data
      const fakeStoreId = "00000000-0000-0000-0000-000000000000";
      const response = await this.api.get(
        `/api/app/products?store_id=${fakeStoreId}`,
        {
          headers: { Authorization: `Bearer ${this.testUser.token}` },
        },
      );

      // Should either return empty results or 403
      this.assert(
        response.status === 200 || response.status === 403,
        `Expected 200 or 403, got ${response.status}`,
      );
      if (response.status === 200) {
        this.assert(
          response.data.products.length === 0,
          "Should not return other store products",
        );
      }
    });
  }

  // ==================== RATE LIMITING TESTS ====================

  async testRateLimiting(): Promise<void> {
    await this.runTest("Rate Limiting", async () => {
      // Make multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          this.api.get("/api/app/me", {
            headers: { Authorization: `Bearer ${this.testUser.token}` },
          }),
        );

      const responses = await Promise.all(requests);
      const allSuccessful = responses.every((r) => r.status === 200);

      this.assert(
        allSuccessful,
        "All requests should succeed (within rate limit)",
      );
    });
  }

  // ==================== CLEANUP ====================

  async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up test data...");

    try {
      // Delete test user's store membership
      if (this.testUser.storeId && this.testUser.userId) {
        await supabase
          .from("store_memberships")
          .delete()
          .eq("user_id", this.testUser.userId)
          .eq("store_id", this.testUser.storeId);
      }

      // Delete test store
      if (this.testUser.storeId) {
        await supabase.from("stores").delete().eq("id", this.testUser.storeId);
      }

      // Delete test user profile
      if (this.testUser.userId) {
        await supabase
          .from("user_profiles")
          .delete()
          .eq("id", this.testUser.userId);
      }

      // Sign out
      await supabase.auth.signOut();

      console.log("✅ Cleanup completed");
    } catch (error: any) {
      console.error("⚠️  Cleanup error:", error.message);
    }
  }

  // ==================== RUN ALL TESTS ====================

  async runAllTests(): Promise<TestResults> {
    console.log("🚀 Starting Comprehensive Integration Tests\n");
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Test User: ${this.testUser.email}\n`);

    console.log("📝 Authentication Tests");
    await this.testUserSignup();
    await this.testUserLogin();

    console.log("\n📝 API Tests (Without Store)");
    await this.testGetMeWithoutStore();
    await this.testShopifyStatusWithoutStore();
    await this.testNotificationsWithoutStore();

    console.log("\n📝 Onboarding Tests");
    await this.testBootstrapStore();

    console.log("\n📝 API Tests (With Store)");
    await this.testGetMeWithStore();
    await this.testDashboardOverview();
    await this.testGetProducts();
    await this.testGetOrders();

    console.log("\n📝 Shopify Integration Tests");
    await this.testShopifyConnectValidation();
    await this.testShopifyStatus();

    console.log("\n📝 Database Tests");
    await this.testDatabaseConnection();
    await this.testStoreCreation();
    await this.testStoreMembership();

    console.log("\n📝 Security Tests");
    await this.testUnauthorizedAccess();
    await this.testInvalidToken();
    await this.testCrossStoreAccess();

    console.log("\n📝 Performance Tests");
    await this.testRateLimiting();

    await this.cleanup();

    return this.results;
  }

  printResults(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(
      `Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`,
    );
    console.log("=".repeat(60));

    if (this.results.failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results.details
        .filter((d) => d.status === "FAIL")
        .forEach((detail) => {
          console.log(`  - ${detail.test}`);
          console.log(`    ${detail.message}`);
        });
    }

    console.log("\n⏱️  Test Durations:");
    this.results.details.forEach((detail) => {
      const icon = detail.status === "PASS" ? "✅" : "❌";
      console.log(`  ${icon} ${detail.test}: ${detail.duration}ms`);
    });
  }
}

// ==================== MAIN ====================

async function main() {
  const tester = new IntegrationTester();

  try {
    const results = await tester.runAllTests();
    tester.printResults();

    // Exit with error code if tests failed
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error("\n💥 Fatal error:", error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

export { IntegrationTester, TestResults };
