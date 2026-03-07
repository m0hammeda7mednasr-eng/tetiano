# 🔧 دليل استكشاف الأخطاء وإصلاحها

## 🚨 الأخطاء الشائعة

### 1. خطأ 500: Internal Server Error

#### الأعراض

```
GET /api/app/dashboard/overview 500 (Internal Server Error)
```

#### الأسباب المحتملة

1. قاعدة البيانات غير متصلة
2. SUPABASE_SERVICE_KEY غير صحيح
3. Migration لم يتم تطبيقه
4. المستخدم ليس لديه store_id

#### الحلول

**الحل 1: تحقق من Railway Logs**

```bash
# في Railway Dashboard
# اذهب إلى Deployments > View Logs
# ابحث عن السطر الذي يحتوي على "error"
```

**الحل 2: تحقق من Environment Variables**

```bash
# في Railway Dashboard
# Variables > تأكد من:
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**الحل 3: تطبيق Migration**

```sql
-- في Supabase SQL Editor
-- انسخ والصق محتوى:
-- supabase/migrations/001_complete_schema.sql
```

**الحل 4: إنشاء Store للمستخدم**

```sql
-- 1. احصل على user_id
SELECT id, email FROM auth.users;

-- 2. أنشئ store
INSERT INTO stores (name, slug, status)
VALUES ('My Store', 'my-store', 'active')
RETURNING id;

-- 3. اربط المستخدم
UPDATE user_profiles
SET store_id = 'STORE_ID_HERE'
WHERE id = 'USER_ID_HERE';
```

---

### 2. خطأ: "store_id context is required"

#### الأعراض

```json
{
  "error": "store_id context is required"
}
```

#### السبب

المستخدم ليس لديه store مرتبط في `user_profiles` أو `store_memberships`

#### الحل

```sql
-- في Supabase SQL Editor

-- 1. تحقق من المستخدم
SELECT
  up.id,
  up.email,
  up.store_id,
  sm.store_id as membership_store_id
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN store_memberships sm ON u.id = sm.user_id
WHERE u.email = 'your-email@example.com';

-- 2. إذا كان store_id = NULL، أنشئ store
INSERT INTO stores (name, slug, status)
VALUES ('My Store', 'my-store', 'active')
RETURNING id;

-- 3. اربط المستخدم بالـ store
UPDATE user_profiles
SET store_id = 'STORE_ID_FROM_STEP_2'
WHERE id = 'USER_ID_FROM_STEP_1';

-- 4. أنشئ membership
INSERT INTO store_memberships (store_id, user_id, store_role, status)
VALUES ('STORE_ID', 'USER_ID', 'admin', 'active');
```

---

### 3. خطأ: "Invalid or expired token"

#### الأعراض

```json
{
  "error": "Invalid or expired token"
}
```

#### الأسباب

1. JWT token منتهي
2. المستخدم غير مسجل دخول
3. Session منتهية

#### الحلول

**الحل 1: تسجيل خروج ودخول**

1. اضغط Logout
2. سجل دخول مرة أخرى
3. جرب العملية مرة أخرى

**الحل 2: مسح Cache**

```javascript
// في Console المتصفح
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**الحل 3: تحقق من Supabase Auth**

```sql
-- في Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'your-email@example.com';
```

---

### 4. خطأ Shopify: "duplicate key value violates unique constraint"

#### الأعراض

```json
{
  "error": "duplicate key value violates unique constraint \"brands_shopify_domain_key\"",
  "code": "23505"
}
```

#### السبب

Shopify store متصل بحساب آخر أو brand آخر

#### الحلول

**الحل 1: افصل الاتصال القديم**

```sql
-- في Supabase SQL Editor
UPDATE brands
SET
  shopify_access_token = NULL,
  access_token = NULL,
  connected_at = NULL,
  is_configured = FALSE,
  is_active = FALSE
WHERE shopify_domain = 'your-store.myshopify.com';
```

**الحل 2: احذف Brand القديم**

```sql
-- ⚠️ احذر: هذا سيحذف كل البيانات المرتبطة
DELETE FROM brands WHERE shopify_domain = 'your-store.myshopify.com';
```

**الحل 3: استخدم Store مختلف**

- استخدم Shopify store مختلف
- أو أنشئ development store جديد

---

### 5. خطأ: Webhook لا يعمل

#### الأعراض

- Orders لا تظهر في التطبيق
- Inventory لا يتحدث تلقائياً
- لا توجد logs في Railway

#### الأسباب

1. Webhook URL غير صحيح
2. Webhook secret غير صحيح
3. Shopify لم يسجل الـ webhooks

#### الحلول

**الحل 1: تحقق من Webhook URL**

```
الصحيح: https://your-backend.up.railway.app/api/webhooks/shopify
الخطأ: https://your-frontend.vercel.app/api/webhooks/shopify
```

**الحل 2: تسجيل Webhooks يدوياً**

```bash
# استخدم Postman أو curl
POST https://your-backend.up.railway.app/api/shopify/setup-webhooks/BRAND_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

**الحل 3: تحقق من Shopify Admin**

1. اذهب إلى Shopify Admin
2. Settings > Notifications > Webhooks
3. تأكد من وجود webhooks للـ topics التالية:
   - orders/create
   - orders/updated
   - products/update
   - inventory_levels/update

---

### 6. خطأ: Frontend لا يتصل بـ Backend

#### الأعراض

```
GET http://localhost:3002/api/app/me net::ERR_CONNECTION_REFUSED
```

#### الأسباب

1. Backend غير مشغل
2. VITE_API_URL غير صحيح
3. CORS issue

#### الحلول

**الحل 1: تحقق من Backend**

```bash
curl https://your-backend.up.railway.app/health
# يجب أن يرجع: {"status":"ok"}
```

**الحل 2: تحقق من Environment Variables**

```env
# في Vercel Dashboard
VITE_API_URL=https://your-backend.up.railway.app
# ⚠️ بدون trailing slash
```

**الحل 3: تحقق من CORS**

```typescript
// في backend/src/index.ts
// تأكد من أن FRONTEND_URL صحيح
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
```

---

### 7. خطأ: Database Schema Mismatch

#### الأعراض

```
ERROR: column "store_id" does not exist
ERROR: relation "shopify_oauth_states" does not exist
```

#### السبب

Migration لم يتم تطبيقه أو تطبيق جزئي

#### الحل

```sql
-- في Supabase SQL Editor
-- 1. احذف كل الجداول القديمة (⚠️ احذر: سيحذف كل البيانات)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. طبق Migration من جديد
-- انسخ والصق محتوى: supabase/migrations/001_complete_schema.sql

-- 3. شغل Setup Script
-- انسخ والصق محتوى: SETUP_DATABASE.sql
```

---

### 8. خطأ: Permission Denied

#### الأعراض

```json
{
  "error": "Missing required permission"
}
```

#### السبب

المستخدم ليس لديه الصلاحيات المطلوبة

#### الحل

```sql
-- في Supabase SQL Editor
-- 1. تحقق من صلاحيات المستخدم
SELECT
  up.id,
  up.email,
  up.role,
  sm.store_role,
  up.permissions
FROM user_profiles up
LEFT JOIN store_memberships sm ON up.id = sm.user_id
WHERE up.id = 'USER_ID';

-- 2. امنح صلاحيات admin
UPDATE store_memberships
SET store_role = 'admin'
WHERE user_id = 'USER_ID';

-- 3. أو أضف صلاحيات محددة
UPDATE user_profiles
SET permissions = jsonb_build_object(
  'can_view_inventory', true,
  'can_edit_inventory', true,
  'can_view_orders', true,
  'can_manage_users', true
)
WHERE id = 'USER_ID';
```

---

## 🔍 أدوات التشخيص

### 1. فحص صحة النظام

```bash
# Backend Health Check
curl https://your-backend.up.railway.app/health

# Database Connection
curl https://your-backend.up.railway.app/api/app/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. فحص Logs

**Railway Logs:**

```bash
# في Railway Dashboard
Deployments > Latest > View Logs
# ابحث عن:
# - "error"
# - "failed"
# - "500"
```

**Supabase Logs:**

```bash
# في Supabase Dashboard
Logs > Query Logs
# ابحث عن slow queries أو errors
```

**Browser Console:**

```javascript
// افتح Developer Tools (F12)
// Console tab
// ابحث عن red errors
```

### 3. فحص Database

```sql
-- تحقق من عدد السجلات
SELECT
  'stores' as table_name, COUNT(*) as count FROM stores
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'store_memberships', COUNT(*) FROM store_memberships
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'shopify_orders', COUNT(*) FROM shopify_orders;

-- تحقق من آخر نشاط
SELECT
  'Last User' as type,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

SELECT
  'Last Order' as type,
  order_name,
  created_at_shopify
FROM shopify_orders
ORDER BY created_at_shopify DESC
LIMIT 1;
```

---

## 📞 الحصول على المساعدة

### قبل طلب المساعدة، جهز:

1. **Railway Logs** (آخر 50 سطر)
2. **Browser Console Errors** (screenshot)
3. **خطوات إعادة إنتاج المشكلة**
4. **Environment Variables** (بدون القيم السرية)
5. **Database Schema Version**

### معلومات مفيدة:

```sql
-- في Supabase SQL Editor
-- احصل على معلومات النظام
SELECT
  'Database Version' as info,
  version() as value
UNION ALL
SELECT
  'Total Users',
  COUNT(*)::text
FROM auth.users
UNION ALL
SELECT
  'Total Stores',
  COUNT(*)::text
FROM stores
UNION ALL
SELECT
  'Total Products',
  COUNT(*)::text
FROM products;
```

---

## ✅ Checklist للتشخيص

عند مواجهة مشكلة، تحقق من:

- [ ] Railway backend يعمل (health check)
- [ ] Supabase متصل (query logs)
- [ ] Environment variables صحيحة
- [ ] Migration تم تطبيقه
- [ ] المستخدم لديه store_id
- [ ] المستخدم لديه صلاحيات
- [ ] JWT token صالح
- [ ] Browser console لا يظهر أخطاء
- [ ] Network tab يظهر 200 responses
- [ ] Shopify webhooks مسجلة

---

**إذا استمرت المشكلة، راجع [SETUP_GUIDE.md](../SETUP_GUIDE.md) أو افتح issue في GitHub**
