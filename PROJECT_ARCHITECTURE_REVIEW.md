# 📋 مراجعة شاملة للمشروع - Tetiano Inventory System

## 🎯 نظرة عامة على المشروع

**Tetiano** هو نظام إدارة مخزون متعدد العلامات التجارية (Multi-Brand Inventory Management System) مبني بتقنيات حديثة وجاهز للإنتاج.

---

## 🏗️ البنية المعمارية (Architecture)

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── components/       # مكونات قابلة لإعادة الاستخدام
│   │   ├── Layout.tsx
│   │   ├── Skeleton.tsx
│   │   ├── StockAdjustModal.tsx
│   │   ├── StockLedgerModal.tsx
│   │   └── ToastContainer.tsx
│   ├── pages/           # صفحات التطبيق
│   │   ├── admin/       # صفحات الأدمن
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminReports.tsx
│   │   │   ├── ShopifySettings.tsx
│   │   │   ├── TeamManagement.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   ├── Orders.tsx
│   │   ├── DailyReports.tsx
│   │   ├── BrandSettings.tsx
│   │   ├── Login.tsx
│   │   └── Signup.tsx
│   ├── store/           # إدارة الحالة (Zustand)
│   │   ├── authStore.ts
│   │   └── toastStore.ts
│   ├── lib/             # مكتبات مساعدة
│   │   ├── api.ts
│   │   ├── supabase.ts
│   │   ├── errorHandler.ts
│   │   └── utils.ts
│   └── App.tsx          # نقطة الدخول الرئيسية
```

### Backend (Node.js + Express + TypeScript)
```
backend/
├── src/
│   ├── routes/          # API Endpoints
│   │   ├── admin.ts
│   │   ├── inventory.ts
│   │   ├── orders.ts
│   │   ├── reports.ts
│   │   ├── notifications.ts
│   │   ├── teams.ts
│   │   ├── shopifyOAuth.ts
│   │   └── webhooks.ts
│   ├── services/        # منطق الأعمال
│   │   ├── inventory.ts
│   │   ├── shopify.ts
│   │   └── webhookHandler.ts
│   ├── middleware/      # Middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── config/          # إعدادات
│   │   ├── supabase.ts
│   │   └── shopify.ts
│   ├── jobs/            # Scheduled Jobs
│   │   └── index.ts
│   ├── utils/           # أدوات مساعدة
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   ├── validator.ts
│   │   └── constants.ts
│   └── index.ts         # نقطة الدخول
```

### Database (Supabase PostgreSQL)
```
supabase/
└── migrations/
    ├── 001_initial_schema.sql       # الجداول الأساسية
    ├── 002_rls_policies.sql         # سياسات الأمان
    ├── 003_seed_data.sql            # بيانات تجريبية
    ├── 004_add_last_sync_at.sql     # تحديثات
    ├── 005_shopify_oauth.sql        # OAuth
    ├── 007_brands_api_creds.sql     # بيانات العلامات
    ├── 008_simplified_rbac.sql      # نظام الصلاحيات
    └── 010_force_admin_on_signup.sql # أول مستخدم أدمن
```

---

## 📊 قاعدة البيانات (Database Schema)

### الجداول الرئيسية:

1. **user_profiles** - ملفات المستخدمين
   - `id`, `full_name`, `role`, `is_active`, `avatar_color`
   - الأدوار: `admin`, `manager`, `staff`

2. **brands** - العلامات التجارية
   - `id`, `name`, `shopify_domain`, `shopify_location_id`

3. **products** - المنتجات (مزامنة من Shopify)
   - `id`, `brand_id`, `shopify_product_id`, `title`, `handle`

4. **variants** - أشكال المنتجات
   - `id`, `product_id`, `shopify_variant_id`, `sku`, `price`

5. **inventory_levels** - مستويات المخزون
   - `id`, `variant_id`, `brand_id`, `available`

6. **stock_movements** - سجل حركات المخزون (Audit Trail)
   - `id`, `variant_id`, `delta`, `source`, `user_id`, `created_at`

7. **daily_reports** - التقارير اليومية
   - `id`, `user_id`, `report_date`, `done_today`, `plan_tomorrow`

8. **notifications** - الإشعارات
   - `id`, `user_id`, `type`, `title`, `message`, `read`

9. **shopify_webhook_events** - أحداث Webhooks (Idempotency)
   - `id`, `event_hash`, `topic`, `processed`, `payload`

---

## 🔐 نظام الصلاحيات (RBAC)

### الأدوار الحالية:
- **admin**: صلاحيات كاملة (إدارة المستخدمين، الفرق، العلامات)
- **manager**: إدارة المخزون والتقارير
- **staff**: عرض وتعديل المخزون

### القاعدة الحالية:
✅ **أول حساب يتم تسجيله يصبح Admin تلقائياً**
✅ **باقي الحسابات تصبح Staff**

هذا تم تطبيقه في:
- `supabase/migrations/010_force_admin_on_signup.sql`
- `handle_new_user()` trigger function

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/signup` - إنشاء حساب جديد
- `POST /api/auth/logout` - تسجيل الخروج

### Inventory
- `GET /api/inventory` - عرض المخزون
- `POST /api/inventory/adjust` - تعديل المخزون
- `GET /api/inventory/:id/ledger` - سجل الحركات

### Orders
- `GET /api/orders` - عرض الطلبات
- `GET /api/orders/:id` - تفاصيل طلب

### Reports
- `GET /api/reports` - عرض التقارير
- `POST /api/reports` - إنشاء تقرير
- `PUT /api/reports/:id` - تحديث تقرير

### Admin
- `GET /api/admin/users` - عرض المستخدمين
- `PUT /api/admin/users/:id` - تحديث مستخدم
- `GET /api/admin/stats` - إحصائيات

### Shopify OAuth
- `GET /api/shopify/auth` - بدء OAuth
- `GET /api/shopify/callback` - استقبال Token
- `POST /api/shopify/disconnect` - فصل العلامة

### Webhooks
- `POST /api/webhooks/inventory` - تحديثات المخزون
- `POST /api/webhooks/orders` - طلبات جديدة

---

## 🚀 التكامل مع Shopify

### OAuth Flow:
1. المستخدم يضغط "ربط علامة تجارية"
2. يتم توجيهه لـ Shopify للموافقة
3. Shopify يرجع Access Token
4. يتم حفظ Token في قاعدة البيانات
5. يبدأ المزامنة التلقائية

### Webhooks:
- `inventory_levels/update` - تحديث المخزون
- `orders/create` - طلب جديد
- `orders/updated` - تحديث طلب
- `products/create` - منتج جديد
- `products/update` - تحديث منتج

### HMAC Verification:
✅ كل webhook يتم التحقق من صحته باستخدام HMAC SHA256

---

## ⏰ Scheduled Jobs

### Daily Report Reminder (18:00 Cairo Time)
```typescript
cron.schedule('0 18 * * *', async () => {
  // إرسال إشعارات للمستخدمين الذين لم يقدموا تقرير اليوم
}, {
  timezone: 'Africa/Cairo'
});
```

---

## 🔒 الأمان (Security)

### Frontend:
- ✅ Protected Routes (تحقق من تسجيل الدخول)
- ✅ Admin Routes (تحقق من صلاحيات الأدمن)
- ✅ Permission Guards (تحقق من صلاحيات محددة)

### Backend:
- ✅ JWT Authentication (Supabase)
- ✅ Rate Limiting (100 requests / 15 minutes)
- ✅ CORS Configuration
- ✅ Security Headers (X-Frame-Options, X-XSS-Protection)
- ✅ Input Validation
- ✅ Error Handling

### Database:
- ✅ Row Level Security (RLS)
- ✅ Service Role for Backend
- ✅ Anon Key for Frontend
- ✅ Triggers for Data Integrity

---

## 📦 Dependencies

### Frontend:
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "@supabase/supabase-js": "^2.39.0",
  "axios": "^1.6.2",
  "zustand": "^4.4.7",
  "lucide-react": "^0.303.0",
  "tailwindcss": "^3.4.0"
}
```

### Backend:
```json
{
  "express": "^4.18.2",
  "@supabase/supabase-js": "^2.39.0",
  "node-cron": "^3.0.3",
  "axios": "^1.6.2",
  "winston": "^3.11.0",
  "cors": "^2.8.5"
}
```

---

## 🌐 Deployment Status

### ✅ GitHub Repository
- **URL**: https://github.com/m0hammeda7mednasr-eng/tetiano
- **Files**: 128 files, 32,432 lines
- **Status**: ✅ Pushed successfully

### ⏳ Frontend (Vercel)
- **Status**: ⚠️ Deployed but showing blank page
- **Issue**: Missing environment variables
- **Fix Needed**: Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### ⏳ Backend (Railway)
- **Status**: ⚠️ Build failed
- **Issue**: Railway detected as Vite static site instead of Node.js
- **Fix Needed**: Set Root Directory to `backend` in Railway Dashboard

### ✅ Database (Supabase)
- **URL**: https://hgphobgcyjrtshwrnxfj.supabase.co
- **Status**: ✅ Running
- **Migrations**: 001-003 applied, 004-010 need to be applied

---

## 🐛 المشاكل الحالية والحلول

### 1. Frontend على Vercel - صفحة بيضاء
**المشكلة**: `Missing Supabase environment variables`

**الحل**:
```bash
# في Vercel Dashboard → Settings → Environment Variables
VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://your-backend.railway.app
```

### 2. Backend على Railway - Build Failed
**المشكلة**: Railway detected as Vite static site

**الحل**:
```bash
# في Railway Dashboard → Settings
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
```

### 3. Database Migrations
**المشكلة**: Migrations 004-010 لم يتم تطبيقها

**الحل**:
```sql
-- في Supabase SQL Editor، قم بتشغيل:
-- 004_add_last_sync_at.sql
-- 005_shopify_oauth.sql
-- 007_brands_api_creds.sql
-- 008_simplified_rbac.sql (أو COMPLETE_FIX.sql)
-- 010_force_admin_on_signup.sql
```

---

## ✅ الخطوات التالية

### 1. إصلاح Backend على Railway
- [ ] فتح Railway Dashboard
- [ ] Settings → Root Directory = `backend`
- [ ] إضافة Environment Variables
- [ ] Redeploy

### 2. إصلاح Frontend على Vercel
- [ ] فتح Vercel Dashboard
- [ ] Settings → Environment Variables
- [ ] إضافة المتغيرات المطلوبة
- [ ] Redeploy

### 3. تطبيق Database Migrations
- [ ] فتح Supabase Dashboard
- [ ] SQL Editor
- [ ] تشغيل Migrations 004-010

### 4. اختبار النظام
- [ ] تسجيل حساب جديد (يجب أن يصبح Admin)
- [ ] تسجيل الدخول
- [ ] عرض Dashboard
- [ ] اختبار Inventory
- [ ] اختبار Reports

---

## 📝 ملاحظات مهمة

1. **أول حساب = Admin**: أول شخص يسجل يصبح Admin تلقائياً
2. **Service Role Key**: موجود في `backend/.env` لكن placeholder، يحتاج للقيمة الحقيقية من Supabase
3. **Shopify Tokens**: موجودة في `.env` لكن placeholder، تحتاج للقيم الحقيقية
4. **GitHub Token**: تم مشاركته في المحادثة، يجب حذفه من GitHub
5. **Port 3002**: Backend يعمل على 3002 بدلاً من 3001 (تعارض)

---

## 🎉 الخلاصة

المشروع **مكتمل من ناحية الكود** ويحتاج فقط:
1. ✅ إصلاح إعدادات Deployment
2. ✅ تطبيق Database Migrations
3. ✅ إضافة Environment Variables

بعد هذه الخطوات، النظام سيكون **جاهز للإنتاج** بالكامل! 🚀
