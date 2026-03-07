#!/bin/bash

# Test script for /api/app/shopify/connect endpoint
# Make sure backend is running locally first: cd backend && npm run dev

echo "🧪 Testing Shopify Connect Endpoint..."
echo ""

# Replace with your actual JWT token from Supabase
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

# Test data
SHOP_DOMAIN="tetiano.myshopify.com"
API_KEY="test-api-key"
API_SECRET="test-api-secret"

echo "📤 Sending POST request to http://localhost:3002/api/app/shopify/connect"
echo ""

curl -X POST http://localhost:3002/api/app/shopify/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"shop\": \"$SHOP_DOMAIN\",
    \"api_key\": \"$API_KEY\",
    \"api_secret\": \"$API_SECRET\"
  }" \
  -w "\n\n📊 HTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Test completed!"
echo ""
echo "Expected response:"
echo "  - HTTP Status: 201"
echo "  - JSON with: install_url, state, shop"
echo ""
echo "If you see 400: Missing required fields"
echo "If you see 401: Invalid JWT token"
echo "If you see 403: No store_id for user"
echo "If you see 500: Database or server error"
