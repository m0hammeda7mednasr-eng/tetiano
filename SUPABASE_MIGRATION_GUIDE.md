# 🗄️ Supabase Migration Guide

## المشكلة

الـ backend بيرجع 503 error:

```
stores table is unavailable. Run migration 017_store_per_tenant_v2.sql
```

معناها الـ **database migration مش موجودة** في Supabase.

## الحل

### Option 1: من Supabase Dashboard (الأسهل)

1. افتح https://supabase.com/dashboard
2. اختار project: **hgphobgcyjrtshwrnxfj**
3. اذهب إلى **SQL Editor**
4. اضغط **New Query**
5. انسخ كل محتوى الملف `supabase/migrations/001_complete_schema.sql`
6. الصقه في SQL Editor
7. اضغط **Run** (أو Ctrl+Enter)
8. انتظر حتى يكتمل التنفيذ (قد يأخذ 30-60 ثانية)

### Option 2: باستخدام Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref hgphobgcyjrtshwrnxfj

# Push migration
supabase db push
```

### Option 3: Manual SQL Execution

إذا كان الملف كبير جداً للـ SQL Editor:

1. افتح `supabase/migrations/001_complete_schema.sql`
2. قسمه إلى أجزاء أصغر (كل 10-15 table)
3. نفذ كل جزء على حدة في SQL Editor

## التحقق من نجاح Migration

### 1. في Supabase Dashboard

اذهب إلى **Table Editor** ويجب أن تشوف:

- ✅ `stores` table
- ✅ `store_memberships` table
- ✅ `user_profiles` table
- ✅ `products` table
- ✅ `variants` table
- ✅ `inventory_levels` table
- ✅ `shopify_orders` table
- ✅ `shopify_customers` table
- ✅ `reports` table
- ✅ `notifications` table
- ✅ وكل الـ tables الأخرى (22 table total)

### 2. Test من Backend

بعد ما تعمل migration، جرب:

```bash
curl https://tetiano-production.up.railway.app/api/onboarding/bootstrap-store \
  -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"store_name":"Test Store","user_full_name":"Test User"}'
```

يجب أن يرجع **200 OK** بدل 503.

## الـ Tables المطلوبة

الـ migration يجب أن ينشئ:

1. `stores` - Store information
2. `store_memberships` - User-store relationships
3. `user_profiles` - User profiles
4. `products` - Shopify products
5. `variants` - Product variants
6. `inventory_levels` - Inventory tracking
7. `shopify_orders` - Orders from Shopify
8. `order_line_items` - Order items
9. `order_financials` - Order financial data
10. `shopify_customers` - Customer data
11. `reports` - Daily reports
12. `notifications` - User notifications
13. `shopify_connections` - Shopify OAuth data
14. `shopify_oauth_states` - OAuth state tracking
15. `shopify_webhook_events` - Webhook logs
16. `brands` - Legacy brand data
17. `store_permissions_overrides` - Permission overrides
18. `audit_logs` - Audit trail
19. `system_settings` - System configuration
20. `scheduled_jobs` - Job scheduling
21. `api_rate_limits` - Rate limiting
22. `feature_flags` - Feature toggles

## Troubleshooting

### Error: "relation already exists"

بعض الـ tables موجودة بالفعل. يمكنك:

1. تجاهل الـ error والمتابعة
2. أو حذف الـ tables الموجودة أولاً (⚠️ خطر - سيحذف البيانات!)

### Error: "permission denied"

تأكد من أنك تستخدم **service_role key** وليس anon key.

### Migration يأخذ وقت طويل

الـ migration يحتوي على 22 table + indexes + RLS policies. قد يأخذ 1-2 دقيقة.

---

**بعد Migration:**

- ✅ الـ 503 errors ستختفي
- ✅ `/api/onboarding/bootstrap-store` سيعمل
- ✅ Users يمكنهم إنشاء stores
- ✅ التطبيق سيعمل بالكامل

**Priority:** 🔥 CRITICAL - يجب تنفيذ Migration قبل أي شيء آخر
