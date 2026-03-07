# 🧪 دليل الاختبار الشامل - Comprehensive Testing Guide

## نظرة عامة

هذا الدليل يشرح كيفية اختبار كل جزء من التطبيق:

- ✅ Backend ↔ Frontend Communication
- ✅ Shopify Integration
- ✅ Database Operations
- ✅ Authentication & Authorization
- ✅ API Endpoints
- ✅ Webhooks
- ✅ Error Handling
- ✅ Rate Limiting

---

## 📋 المتطلبات

### 1. Environment Variables

تأكد من وجود الـ environment variables في `.env`:

```bash
# Backend
BACKEND_URL=https://tetiano-production.up.railway.app
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Frontend
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://tetiano-production.up.railway.app
```

### 2. Dependencies

```bash
cd backend
npm install
```

---

## 🚀 تشغيل الاختبارات

### 1. اختبار شامل للـ Integration (Backend + Frontend + Database)

```bash
cd backend
npm test
```

هذا الاختبار يغطي:

- ✅ User signup & login
- ✅ API endpoints (مع وبدون store)
- ✅ Store creation (onboarding)
- ✅ Dashboard data
- ✅ Products & Orders
- ✅ Shopify status
- ✅ Database operations
- ✅ Security & permissions
- ✅ Rate limiting

### 2. اختبار Shopify Webhooks

```bash
cd backend
npm run test:webhooks
```

هذا الاختبار يغطي:

- ✅ Product webhooks
- ✅ Order webhooks
- ✅ Inventory webhooks
- ✅ HMAC validation
- ✅ Idempotency (duplicate prevention)
- ✅ Rate limiting

### 3. تشغيل كل الاختبارات

```bash
cd backend
npm run test:all
```

---

## 📊 فهم النتائج

### نتيجة ناجحة ✅

```
🚀 Starting Comprehensive Integration Tests

Backend URL: https://tetiano-production.up.railway.app
Frontend URL: https://tetiano.vercel.app
Test User: test-1234567890@example.com

📝 Authentication Tests
✅ User Signup
✅ User Login

📝 API Tests (Without Store)
✅ GET /api/app/me (without store)
✅ GET /api/app/shopify/status (without store)
✅ GET /api/app/notifications/unread-count (without store)

📝 Onboarding Tests
✅ POST /api/onboarding/bootstrap-store

📝 API Tests (With Store)
✅ GET /api/app/me (with store)
✅ GET /api/app/dashboard/overview
✅ GET /api/app/products
✅ GET /api/app/orders

📝 Shopify Integration Tests
✅ POST /api/app/shopify/connect (validation)
✅ GET /api/app/shopify/status (with store)

📝 Database Tests
✅ Database Connection
✅ Store Creation in Database
✅ Store Membership Creation

📝 Security Tests
✅ Unauthorized Access
✅ Invalid Token
✅ Cross-Store Access Prevention

📝 Performance Tests
✅ Rate Limiting

🧹 Cleaning up test data...
✅ Cleanup completed

============================================================
📊 TEST RESULTS
============================================================
Total Tests: 20
✅ Passed: 20
❌ Failed: 0
Success Rate: 100.0%
============================================================
```

### نتيجة فاشلة ❌

```
❌ GET /api/app/me (without store): Expected 200, got 403

============================================================
📊 TEST RESULTS
============================================================
Total Tests: 20
✅ Passed: 19
❌ Failed: 1
Success Rate: 95.0%
============================================================

❌ Failed Tests:
  - GET /api/app/me (without store)
    Expected 200, got 403
```

---

## 🔍 اختبار يدوي Manual Testing

### 1. اختبار Frontend

#### A. New User Flow

1. افتح https://tetiano.vercel.app
2. اضغط "Sign Up"
3. سجل بـ email جديد
4. يجب أن تظهر Dashboard (بدون 403 errors)
5. اضغط "Create Store" أو انتظر auto-creation
6. تحقق من ظهور Store name في الـ header

#### B. Shopify Connection

1. اذهب إلى Settings
2. اضغط "Connect Shopify"
3. أدخل:
   - Shop domain: `your-store.myshopify.com`
   - API Key: من Shopify Admin
   - API Secret: من Shopify Admin
4. اضغط "Connect"
5. يجب أن يتم redirect إلى Shopify OAuth
6. وافق على الـ permissions
7. يجب أن يرجع إلى Settings مع "Connected" status

#### C. Products & Inventory

1. اذهب إلى Inventory
2. يجب أن تظهر Products من Shopify
3. جرب البحث عن product
4. اضغط على product لتعديله
5. غير الـ SKU أو Price
6. احفظ التغييرات
7. تحقق من التحديث في Shopify Admin

#### D. Orders

1. اذهب إلى Orders
2. يجب أن تظهر Orders من Shopify
3. جرب الـ filters (status, date range)
4. اضغط على order لرؤية التفاصيل

### 2. اختبار Backend API

#### A. Health Check

```bash
curl https://tetiano-production.up.railway.app/health
```

يجب أن يرجع:

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T..."
}
```

#### B. Authentication

```bash
# Get token from Supabase
TOKEN="your_access_token"

# Test /me endpoint
curl https://tetiano-production.up.railway.app/api/app/me \
  -H "Authorization: Bearer $TOKEN"
```

#### C. Dashboard

```bash
curl https://tetiano-production.up.railway.app/api/app/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"
```

#### D. Products

```bash
curl "https://tetiano-production.up.railway.app/api/app/products?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. اختبار Database

#### A. Supabase Dashboard

1. افتح Supabase Dashboard
2. اذهب إلى Table Editor
3. تحقق من الـ tables:
   - `stores` - يجب أن يحتوي على stores
   - `store_memberships` - يجب أن يحتوي على memberships
   - `user_profiles` - يجب أن يحتوي على profiles
   - `products` - يجب أن يحتوي على products من Shopify
   - `shopify_orders` - يجب أن يحتوي على orders

#### B. SQL Queries

```sql
-- Check stores
SELECT id, name, status, created_at FROM stores ORDER BY created_at DESC LIMIT 10;

-- Check memberships
SELECT sm.*, up.full_name
FROM store_memberships sm
JOIN user_profiles up ON sm.user_id = up.id
ORDER BY sm.created_at DESC LIMIT 10;

-- Check products
SELECT id, title, vendor, status, created_at
FROM products
ORDER BY created_at DESC LIMIT 10;

-- Check orders
SELECT id, order_name, total_price, currency, financial_status
FROM shopify_orders
ORDER BY created_at_shopify DESC LIMIT 10;
```

### 4. اختبار Shopify Webhooks

#### A. من Shopify Admin

1. اذهب إلى Settings > Notifications > Webhooks
2. تحقق من وجود webhooks:
   - `products/create`
   - `products/update`
   - `orders/create`
   - `orders/updated`
   - `inventory_levels/update`
3. كل webhook يجب أن يشير إلى:
   ```
   https://tetiano-production.up.railway.app/api/webhooks/shopify
   ```

#### B. Test Webhook Manually

```bash
# Generate HMAC
WEBHOOK_SECRET="your_webhook_secret"
PAYLOAD='{"id":123,"title":"Test Product"}'
HMAC=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

# Send webhook
curl -X POST https://tetiano-production.up.railway.app/api/webhooks/shopify \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: products/create" \
  -H "X-Shopify-Shop-Domain: your-store.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "X-Shopify-Webhook-Id: test-$(date +%s)" \
  -d "$PAYLOAD"
```

---

## 🐛 Troubleshooting

### مشكلة: 403 Forbidden

**السبب:** User ليس لديه store أو permissions

**الحل:**

1. تحقق من أن `/api/app/me` يعمل بدون store
2. تحقق من أن `bootstrap-store` تم بنجاح
3. تحقق من الـ `store_memberships` في Database

### مشكلة: Shopify Connection Failed

**السبب:** Invalid credentials أو OAuth redirect

**الحل:**

1. تحقق من API Key & Secret في Shopify Admin
2. تحقق من Redirect URL في Shopify App settings:
   ```
   https://tetiano-production.up.railway.app/api/shopify/callback
   ```
3. تحقق من الـ scopes المطلوبة

### مشكلة: Webhooks Not Received

**السبب:** Invalid webhook URL أو HMAC

**الحل:**

1. تحقق من webhook URL في Shopify Admin
2. تحقق من `SHOPIFY_WEBHOOK_SECRET` في Railway
3. تحقق من الـ logs في Railway:
   ```bash
   railway logs
   ```

### مشكلة: Database Connection Failed

**السبب:** Invalid Supabase credentials

**الحل:**

1. تحقق من `SUPABASE_URL` و `SUPABASE_SERVICE_KEY`
2. تحقق من أن Database running في Supabase Dashboard
3. تحقق من الـ migrations:
   ```bash
   supabase db push
   ```

---

## 📈 Performance Testing

### Load Testing

```bash
# Install Apache Bench
# Windows: Download from Apache website
# Mac: brew install httpd
# Linux: sudo apt-get install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  https://tetiano-production.up.railway.app/api/app/me
```

### Expected Results

- ✅ Requests per second: > 100
- ✅ Average response time: < 200ms
- ✅ Failed requests: 0%

---

## ✅ Checklist قبل Production

### Backend

- [ ] All tests passing (npm test)
- [ ] Webhook tests passing (npm run test:webhooks)
- [ ] Environment variables configured in Railway
- [ ] Database migrations applied
- [ ] Logs showing no errors

### Frontend

- [ ] Build successful (npm run build)
- [ ] No console errors
- [ ] All pages loading correctly
- [ ] Shopify connection working
- [ ] Products & Orders displaying

### Database

- [ ] All tables created
- [ ] Indexes applied
- [ ] RLS policies enabled
- [ ] Backup configured

### Shopify

- [ ] App installed in store
- [ ] Webhooks configured
- [ ] OAuth working
- [ ] API credentials valid

### Security

- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Authentication working
- [ ] Permissions enforced
- [ ] No sensitive data in logs

---

## 📞 Support

إذا واجهت أي مشاكل:

1. تحقق من الـ logs:

   ```bash
   # Railway logs
   railway logs

   # Supabase logs
   # Check in Supabase Dashboard > Logs
   ```

2. تحقق من الـ test results:

   ```bash
   npm run test:all
   ```

3. راجع الـ documentation:
   - `docs/api.md` - API documentation
   - `docs/troubleshooting.md` - Common issues
   - `HOTFIX_403_ERRORS.md` - 403 error fixes

---

**تم إنشاؤه:** 2026-03-07  
**الإصدار:** 2.0.0  
**الحالة:** ✅ Production Ready
