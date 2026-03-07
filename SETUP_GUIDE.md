# 🚀 دليل الإعداد الكامل - Tetiano Inventory System

## 📋 المتطلبات الأساسية

- حساب Supabase (مجاني)
- حساب Railway (مجاني)
- حساب Vercel (مجاني)
- حساب Shopify Partner (مجاني)
- Node.js 18+ (للتطوير المحلي)

---

## 1️⃣ إعداد قاعدة البيانات (Supabase)

### الخطوة 1: إنشاء مشروع جديد

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اضغط "New Project"
3. اختر اسم المشروع وكلمة المرور

### الخطوة 2: تطبيق Migration

1. افتح SQL Editor في Supabase
2. انسخ محتوى الملف `supabase/migrations/001_complete_schema.sql`
3. الصق في SQL Editor واضغط "Run"
4. انتظر حتى ينتهي التنفيذ (قد يستغرق 30-60 ثانية)

### الخطوة 3: تشغيل Setup Script

1. افتح SQL Editor مرة أخرى
2. انسخ محتوى الملف `SETUP_DATABASE.sql`
3. الصق واضغط "Run"

### الخطوة 4: الحصول على API Keys

1. اذهب إلى Settings > API
2. انسخ:
   - `Project URL` (SUPABASE_URL)
   - `anon public` key (SUPABASE_ANON_KEY)
   - `service_role` key (SUPABASE_SERVICE_KEY) ⚠️ سري جداً

---

## 2️⃣ إعداد Backend (Railway)

### الخطوة 1: إنشاء مشروع جديد

1. اذهب إلى [Railway Dashboard](https://railway.app/dashboard)
2. اضغط "New Project"
3. اختر "Deploy from GitHub repo"
4. اختر repository الخاص بك

### الخطوة 2: إعداد Environment Variables

اذهب إلى Variables واضف:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend Configuration
BACKEND_URL=https://your-app.up.railway.app
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
PORT=3002

# Shopify Configuration (Optional - يمكن إضافتها لاحقاً)
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
SHOPIFY_HTTP_TIMEOUT_MS=15000

# Security
JWT_SECRET=your-random-secret-key-here
```

### الخطوة 3: إعداد Build Settings

1. اذهب إلى Settings > Build
2. Root Directory: `backend`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`

### الخطوة 4: Deploy

1. اضغط "Deploy"
2. انتظر حتى ينتهي البناء
3. احصل على URL من Settings > Domains

---

## 3️⃣ إعداد Frontend (Vercel)

### الخطوة 1: إنشاء مشروع جديد

1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اضغط "Add New" > "Project"
3. اختر repository الخاص بك

### الخطوة 2: إعداد Build Settings

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### الخطوة 3: إعداد Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://your-backend.up.railway.app
```

### الخطوة 4: Deploy

1. اضغط "Deploy"
2. انتظر حتى ينتهي البناء
3. احصل على URL

---

## 4️⃣ إعداد Shopify App

### الخطوة 1: إنشاء Shopify Partner Account

1. اذهب إلى [Shopify Partners](https://partners.shopify.com/)
2. سجل حساب جديد

### الخطوة 2: إنشاء App جديد

1. من Dashboard، اضغط "Apps" > "Create app"
2. اختر "Custom app"
3. اسم التطبيق: "Tetiano Inventory"

### الخطوة 3: إعداد OAuth

1. اذهب إلى App setup > Configuration
2. App URL: `https://your-frontend.vercel.app`
3. Allowed redirection URL(s):
   ```
   https://your-backend.up.railway.app/api/shopify/callback
   https://your-frontend.vercel.app/shopify/callback
   ```

### الخطوة 4: إعداد Scopes

اختر الصلاحيات التالية:

- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `read_customers`
- `read_locations`

### الخطوة 5: الحصول على API Credentials

1. اذهب إلى App setup > API credentials
2. انسخ:
   - API key
   - API secret key

---

## 5️⃣ الاختبار والتحقق

### اختبار Backend

```bash
curl https://your-backend.up.railway.app/health
# يجب أن يرجع: {"status":"ok"}
```

### اختبار Frontend

1. افتح `https://your-frontend.vercel.app`
2. يجب أن تظهر صفحة تسجيل الدخول

### اختبار التسجيل

1. اضغط "Sign Up"
2. أدخل:
   - Email: `admin@example.com`
   - Password: `password123`
   - Full Name: `Admin User`
3. اضغط "Sign Up"
4. يجب أن يتم إنشاء حساب وتسجيل دخول تلقائي

### اختبار Shopify Integration

1. اذهب إلى Settings > Shopify
2. أدخل:
   - Shop Domain: `your-store.myshopify.com`
   - API Key: من Shopify App
   - API Secret: من Shopify App
3. اضغط "Connect to Shopify"
4. يجب أن يتم توجيهك إلى Shopify للموافقة
5. بعد الموافقة، يجب أن يتم الاتصال بنجاح

---

## 6️⃣ استكشاف الأخطاء

### خطأ: "store_id context is required"

**السبب:** المستخدم ليس لديه store مرتبط

**الحل:**

```sql
-- في Supabase SQL Editor
-- 1. احصل على user_id
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. أنشئ store
INSERT INTO stores (name, slug, status, created_at, updated_at)
VALUES ('My Store', 'my-store', 'active', NOW(), NOW())
RETURNING id;

-- 3. اربط المستخدم بالـ store
UPDATE user_profiles
SET store_id = 'STORE_ID_FROM_STEP_2'
WHERE id = 'USER_ID_FROM_STEP_1';

-- 4. أنشئ membership
INSERT INTO store_memberships (store_id, user_id, store_role, status)
VALUES ('STORE_ID', 'USER_ID', 'admin', 'active');
```

### خطأ: "Invalid or expired token"

**السبب:** JWT token منتهي أو غير صحيح

**الحل:**

1. سجل خروج
2. سجل دخول مرة أخرى
3. امسح cache المتصفح

### خطأ: 500 في /api/app/shopify/connect

**السبب:** مشكلة في قاعدة البيانات أو credentials

**الحل:**

1. تحقق من Railway logs
2. تأكد من أن SUPABASE_SERVICE_KEY صحيح
3. تأكد من أن migration 001 تم تطبيقه

### خطأ: "duplicate key value violates unique constraint"

**السبب:** Shopify store متصل بحساب آخر

**الحل:**

```sql
-- افصل الاتصال القديم
UPDATE brands
SET shopify_access_token = NULL,
    access_token = NULL,
    connected_at = NULL,
    is_configured = FALSE
WHERE shopify_domain = 'your-store.myshopify.com';

-- أو احذف السجل القديم
DELETE FROM brands WHERE shopify_domain = 'your-store.myshopify.com';
```

### خطأ: Webhook لا يعمل

**السبب:** Webhook secret غير صحيح أو URL خاطئ

**الحل:**

1. تحقق من Shopify App settings
2. تأكد من أن Webhook URL صحيح:
   ```
   https://your-backend.up.railway.app/api/webhooks/shopify
   ```
3. تحقق من Railway logs للأخطاء

---

## 7️⃣ الصيانة والمراقبة

### مراقبة Logs

- **Railway:** https://railway.app/dashboard > Your Project > Deployments
- **Vercel:** https://vercel.com/dashboard > Your Project > Logs
- **Supabase:** https://supabase.com/dashboard > Your Project > Logs

### Backup قاعدة البيانات

```bash
# من Supabase Dashboard
# Settings > Database > Backups
# اضغط "Create backup"
```

### تحديث التطبيق

```bash
# 1. Push changes to GitHub
git add .
git commit -m "Update"
git push

# 2. Railway و Vercel سيقومان بالـ deploy تلقائياً
```

---

## 8️⃣ الأمان والأداء

### Best Practices

1. ✅ لا تشارك SUPABASE_SERVICE_KEY أبداً
2. ✅ استخدم HTTPS فقط
3. ✅ فعّل Row Level Security في Supabase
4. ✅ راجع logs بانتظام
5. ✅ احتفظ بنسخ احتياطية

### تحسين الأداء

1. استخدم CDN لـ static assets
2. فعّل caching في Vercel
3. راقب database queries في Supabase
4. استخدم indexes للجداول الكبيرة

---

## 📞 الدعم

### الموارد

- [Supabase Docs](https://supabase.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
- [Shopify API Docs](https://shopify.dev/docs)

### المشاكل الشائعة

راجع [docs/troubleshooting.md](docs/troubleshooting.md)

---

## ✅ Checklist

قبل الإطلاق، تأكد من:

- [ ] Migration 001 تم تطبيقه في Supabase
- [ ] Setup script تم تشغيله
- [ ] Environment variables صحيحة في Railway
- [ ] Environment variables صحيحة في Vercel
- [ ] Shopify App تم إنشاؤه وإعداده
- [ ] OAuth redirect URLs صحيحة
- [ ] Webhook URL صحيح
- [ ] اختبار التسجيل يعمل
- [ ] اختبار Shopify connection يعمل
- [ ] Logs لا تظهر أخطاء
- [ ] Backup تم إنشاؤه

---

**تم! 🎉 التطبيق جاهز للاستخدام**
