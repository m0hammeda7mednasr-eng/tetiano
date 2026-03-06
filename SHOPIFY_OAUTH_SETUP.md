# دليل ربط Shopify عبر OAuth - خطوة بخطوة

## 🎯 نظرة عامة

هذا الدليل يشرح كيفية ربط متجر Shopify بالنظام عبر OAuth 2.0 بشكل احترافي.

---

## 📋 المتطلبات الأساسية

### 1. Environment Variables في Railway

تأكد من وجود المتغيرات التالية في Railway:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service Role Key (ليس anon key!)

# Frontend
FRONTEND_URL=https://tetiano-git-main-mohs-projects-0b03337a.vercel.app

# Backend
BACKEND_URL=https://tetiano-production.up.railway.app
API_URL=https://tetiano-production.up.railway.app

# CORS (اختياري)
CORS_ALLOWED_ORIGINS=https://tetiano.vercel.app,https://tetiano-git-main-mohs-projects-0b03337a.vercel.app
```

### 2. التحقق من Supabase Service Key

الـ Service Key يجب أن يكون:
- يبدأ بـ `eyJhbGc...`
- من Supabase Dashboard → Settings → API → service_role key
- **ليس** anon key!

---

## 🔧 خطوات الإعداد

### الخطوة 1: إنشاء Shopify App

1. اذهب إلى Shopify Admin
2. Settings → Apps and sales channels → Develop apps
3. اضغط "Create an app"
4. أدخل اسم التطبيق (مثلاً: "Tetiano Inventory")

### الخطوة 2: تكوين الصلاحيات

1. في تبويب **Configuration**
2. اضغط "Configure" في **Admin API integration**
3. اختر الصلاحيات التالية:
   - ✅ Products: `read_products`, `write_products`
   - ✅ Inventory: `read_inventory`, `write_inventory`
   - ✅ Orders: `read_orders`
   - ✅ Locations: `read_locations`
4. احفظ التغييرات

### الخطوة 3: إضافة Redirect URI

1. في **App setup** → **URLs**
2. في حقل **Allowed redirection URL(s)**، أضف:
   ```
   https://tetiano-production.up.railway.app/api/shopify/callback
   ```
3. احفظ

### الخطوة 4: تثبيت التطبيق

1. اضغط "Install app"
2. وافق على الصلاحيات

### الخطوة 5: نسخ البيانات

بعد التثبيت، ستحصل على:

1. **API key** (Client ID)
   - مثال: `a1b2c3d4e5f6g7h8`
   
2. **API secret key** (Client Secret)
   - يبدأ بـ `shpss_`
   - **ليس** Admin API access token (الذي يبدأ بـ `shpat_`)!

---

## 🚀 الربط من لوحة التحكم

### في صفحة Shopify Settings:

1. **انسخ Redirect URI** من المربع البرتقالي في أعلى الصفحة
2. **اختر العلامة التجارية** من القائمة
3. **أدخل البيانات**:
   - Shopify Store Domain: `your-store.myshopify.com`
   - API Key: `a1b2c3d4e5f6g7h8`
   - API Secret Key: `shpss_xxxxxxxxxxxxx`
4. اضغط **"ربط عبر OAuth"**
5. ستُوجه إلى Shopify للموافقة
6. بعد الموافقة، سيتم الربط تلقائياً

---

## 🔍 استكشاف الأخطاء

### خطأ: CORS Policy

**المشكلة**: `Access to XMLHttpRequest has been blocked by CORS policy`

**الحل**:
1. تأكد من إضافة `FRONTEND_URL` في Railway
2. أعد deploy الـ Backend من Railway Dashboard

### خطأ: 500 Internal Server Error

**الأسباب المحتملة**:

1. **Supabase Service Key خطأ**
   - تحقق من أنك تستخدم `service_role` key وليس `anon` key
   - الـ key يجب أن يبدأ بـ `eyJhbGc...`

2. **Database Connection**
   - تحقق من أن الـ tables موجودة في Supabase
   - تحقق من الـ RLS policies

3. **Missing Environment Variables**
   - تأكد من وجود جميع المتغيرات المطلوبة

4. **Schema mismatch في جدول `brands`**
   - إذا ظهر خطأ مثل: `column brands.shopify_api_key does not exist`
   - شغّل migration: `supabase/migrations/015_shopify_schema_compat.sql`
   - هذا يضيف أعمدة التوافق: `shopify_api_key`, `shopify_access_token`

### خطأ: Invalid OAuth State

**المشكلة**: `Invalid OAuth state` بعد الـ callback

**الحل**:
1. تأكد من أن الـ `shopify_oauth_states` table موجود
2. تحقق من الـ TTL (15 دقيقة)
3. جرب مرة أخرى

### خطأ: API Secret Must Be...

**المشكلة**: `api_secret must be Shopify App API Secret Key, not Admin API access token`

**الحل**:
- استخدم **API secret key** (يبدأ بـ `shpss_`)
- **لا تستخدم** Admin API access token (يبدأ بـ `shpat_`)

---

## 📊 التحقق من الربط

بعد الربط الناجح:

1. ✅ المتجر يظهر في قسم "المتاجر المربوطة"
2. ✅ حالة الربط: "✓ مربوط"
3. ✅ يمكنك عمل "مزامجة" لجلب المنتجات
4. ✅ Webhooks يمكن تفعيلها

---

## 🔐 الأمان

- ✅ OAuth 2.0 آمن ومعتمد من Shopify
- ✅ الـ tokens مشفرة في قاعدة البيانات
- ✅ الـ API secrets لا تُخزن في Frontend
- ✅ HTTPS فقط للاتصالات

---

## 📞 الدعم

إذا واجهت مشاكل:

1. تحقق من الـ Railway Logs
2. تحقق من الـ Supabase Logs
3. تأكد من جميع Environment Variables
4. تأكد من الـ Redirect URI صحيح

---

## 🎉 بعد الربط

يمكنك الآن:

- ✅ مزامجة المنتجات من Shopify
- ✅ تفعيل Webhooks للتحديثات التلقائية
- ✅ إدارة المخزون من لوحة التحكم
- ✅ تتبع الأوردرات

---

**آخر تحديث**: مارس 2026
