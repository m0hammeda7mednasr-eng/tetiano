# 🔐 دليل Environment Variables الشامل

**آخر تحديث**: 6 مارس 2026  
**الحالة**: دليل كامل للإعداد الاحترافي

---

## 📋 جدول المحتويات

1. [Backend (Railway)](#backend-railway)
2. [Frontend (Vercel)](#frontend-vercel)
3. [Local Development](#local-development)
4. [كيفية الحصول على القيم](#كيفية-الحصول-على-القيم)
5. [التحقق من الإعداد](#التحقق-من-الإعداد)
6. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🚂 Backend (Railway)

### المتغيرات المطلوبة

```env
# ═══════════════════════════════════════════════════════════
# Supabase Configuration (مطلوب)
# ═══════════════════════════════════════════════════════════

SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5ODA1NCwiZXhwIjoyMDg3ODc0MDU0fQ.Ip8txSkRkgVXNZ4FEEnSqUTVYisV2SiA8ozbynVq3bg
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTgwNTQsImV4cCI6MjA4Nzg3NDA1NH0.0lH6_OkPXvYb1PokkudAipBxaenwrmwPu5tk60sYqVU

# ═══════════════════════════════════════════════════════════
# URLs Configuration (مطلوب)
# ═══════════════════════════════════════════════════════════

FRONTEND_URL=https://tetiano.vercel.app
BACKEND_URL=https://tetiano-production.up.railway.app
API_URL=https://tetiano-production.up.railway.app

# ═══════════════════════════════════════════════════════════
# Server Configuration (مطلوب)
# ═══════════════════════════════════════════════════════════

PORT=3002
NODE_ENV=production

# ═══════════════════════════════════════════════════════════
# CORS Configuration (اختياري - للتحكم الدقيق)
# ═══════════════════════════════════════════════════════════

CORS_ALLOWED_ORIGINS=https://tetiano.vercel.app,https://tetiano-git-main-mohs-projects-0b03337a.vercel.app
CORS_ALLOWED_ORIGIN_PATTERNS=

# ═══════════════════════════════════════════════════════════
# Shopify Configuration (اختياري - للإعداد المسبق)
# ═══════════════════════════════════════════════════════════

SHOPIFY_API_VERSION=2024-01
SHOPIFY_REDIRECT_URI=https://tetiano-production.up.railway.app/api/shopify/callback
SHOPIFY_HTTP_TIMEOUT_MS=15000

# ═══════════════════════════════════════════════════════════
# Security & Rate Limiting (اختياري)
# ═══════════════════════════════════════════════════════════

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ═══════════════════════════════════════════════════════════
# Logging (اختياري)
# ═══════════════════════════════════════════════════════════

LOG_LEVEL=info
```

### ترتيب الأولوية

| الأولوية | المتغير | الوصف |
|---------|---------|--------|
| 🔴 حرج | `SUPABASE_URL` | رابط قاعدة البيانات |
| 🔴 حرج | `SUPABASE_SERVICE_KEY` | مفتاح الخدمة (service_role) |
| 🟠 مهم | `FRONTEND_URL` | رابط الـ Frontend |
| 🟠 مهم | `BACKEND_URL` | رابط الـ Backend |
| 🟡 موصى به | `NODE_ENV` | بيئة التشغيل |
| 🟡 موصى به | `PORT` | منفذ الخادم |
| ⚪ اختياري | باقي المتغيرات | للتحكم الدقيق |

---

## 🎨 Frontend (Vercel)

### المتغيرات المطلوبة

```env
# ═══════════════════════════════════════════════════════════
# Supabase Configuration (مطلوب)
# ═══════════════════════════════════════════════════════════

VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTgwNTQsImV4cCI6MjA4Nzg3NDA1NH0.0lH6_OkPXvYb1PokkudAipBxaenwrmwPu5tk60sYqVU

# ═══════════════════════════════════════════════════════════
# API Configuration (مطلوب)
# ═══════════════════════════════════════════════════════════

VITE_API_URL=https://tetiano-production.up.railway.app

# ═══════════════════════════════════════════════════════════
# App Configuration (اختياري)
# ═══════════════════════════════════════════════════════════

VITE_APP_NAME=Tetiano
VITE_APP_VERSION=1.0.0
```

### ملاحظات مهمة للـ Frontend

⚠️ **تحذير**: 
- استخدم `VITE_SUPABASE_ANON_KEY` فقط (ليس service_role!)
- جميع المتغيرات يجب أن تبدأ بـ `VITE_`
- المتغيرات تُضمّن في الـ build (مرئية للمستخدم)

---

## 💻 Local Development

### Backend (.env)

```env
# Supabase
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3002
API_URL=http://localhost:3002

# Server
PORT=3002
NODE_ENV=development

# Shopify (للتطوير)
SHOPIFY_REDIRECT_URI=http://localhost:3002/api/shopify/callback
```

### Frontend (.env)

```env
# Supabase
VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# API
VITE_API_URL=http://localhost:3002
```

---

## 🔑 كيفية الحصول على القيم

### 1. Supabase Keys

#### الحصول على SUPABASE_URL:
1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر المشروع
3. Settings → API
4. انسخ **Project URL**

#### الحصول على SUPABASE_SERVICE_KEY:
1. نفس الصفحة (Settings → API)
2. انسخ **service_role** key
3. ⚠️ **مهم**: هذا المفتاح سري جداً!
4. يبدأ بـ `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### الحصول على SUPABASE_ANON_KEY:
1. نفس الصفحة (Settings → API)
2. انسخ **anon** key (public)
3. آمن للاستخدام في Frontend

### 2. URLs

#### FRONTEND_URL:
- **Production**: `https://tetiano.vercel.app`
- **Preview**: `https://tetiano-git-main-mohs-projects-0b03337a.vercel.app`
- **Local**: `http://localhost:5173`

#### BACKEND_URL:
- **Production**: `https://tetiano-production.up.railway.app`
- **Local**: `http://localhost:3002`

### 3. Shopify (بعد إنشاء App)

سيتم الحصول عليها من Shopify Admin بعد إنشاء التطبيق.

---

## ✅ التحقق من الإعداد

### Railway (Backend)

```bash
# 1. افتح Railway Dashboard
# 2. Backend Project → Variables
# 3. تأكد من وجود جميع المتغيرات المطلوبة
# 4. اضغط Deploy إذا قمت بتعديل أي شيء
```

### Vercel (Frontend)

```bash
# 1. افتح Vercel Dashboard
# 2. Project → Settings → Environment Variables
# 3. تأكد من وجود جميع المتغيرات المطلوبة
# 4. Redeploy إذا قمت بتعديل أي شيء
```

### اختبار Local

```bash
# Backend
cd backend
npm run dev
# يجب أن يعمل بدون errors

# Frontend
cd frontend
npm run dev
# يجب أن يعمل بدون errors
```

---

## 🔍 استكشاف الأخطاء

### خطأ: "Missing Supabase environment variables"

**السبب**: `SUPABASE_URL` أو `SUPABASE_SERVICE_KEY` مفقود

**الحل**:
1. تحقق من Railway Variables
2. تأكد من الأسماء صحيحة (case-sensitive)
3. أعد Deploy

### خطأ: "CORS Policy"

**السبب**: `FRONTEND_URL` غير صحيح أو مفقود

**الحل**:
1. أضف `FRONTEND_URL` في Railway
2. تأكد من الرابط صحيح (بدون / في النهاية)
3. أعد Deploy

### خطأ: "Invalid Supabase key"

**السبب**: استخدام `anon` key بدلاً من `service_role` key

**الحل**:
1. تأكد من استخدام **service_role** key في Backend
2. تأكد من استخدام **anon** key في Frontend

### خطأ: "Cannot connect to database"

**السبب**: `SUPABASE_URL` خطأ أو الشبكة

**الحل**:
1. تحقق من `SUPABASE_URL`
2. تأكد من أن المشروع نشط في Supabase
3. تحقق من الـ logs في Railway

---

## 📊 Checklist النهائي

### Railway (Backend)
- [ ] `SUPABASE_URL` ✓
- [ ] `SUPABASE_SERVICE_KEY` ✓ (service_role)
- [ ] `SUPABASE_ANON_KEY` ✓
- [ ] `FRONTEND_URL` ✓
- [ ] `BACKEND_URL` ✓
- [ ] `PORT=3002` ✓
- [ ] `NODE_ENV=production` ✓

### Vercel (Frontend)
- [ ] `VITE_SUPABASE_URL` ✓
- [ ] `VITE_SUPABASE_ANON_KEY` ✓ (anon)
- [ ] `VITE_API_URL` ✓

### Local Development
- [ ] `backend/.env` موجود ✓
- [ ] `frontend/.env` موجود ✓
- [ ] جميع القيم صحيحة ✓

---

## 🎯 نصائح احترافية

### الأمان
1. ✅ **لا تشارك** `SUPABASE_SERVICE_KEY` أبداً
2. ✅ **لا ترفع** ملفات `.env` على Git
3. ✅ استخدم `.env.example` للتوثيق فقط
4. ✅ غيّر المفاتيح إذا تم تسريبها

### الأداء
1. ✅ استخدم `NODE_ENV=production` في Production
2. ✅ فعّل CORS فقط للنطاقات المطلوبة
3. ✅ استخدم Rate Limiting

### الصيانة
1. ✅ وثّق أي تغييرات في المتغيرات
2. ✅ احتفظ بنسخة احتياطية من القيم
3. ✅ راجع المتغيرات دورياً

---

## 📞 الدعم

إذا واجهت مشاكل:

1. **تحقق من Logs**:
   - Railway: Dashboard → Logs
   - Vercel: Dashboard → Deployments → Logs

2. **اختبر الاتصال**:
   ```bash
   curl https://tetiano-production.up.railway.app/health
   ```

3. **تحقق من Supabase**:
   - Dashboard → Logs
   - تأكد من أن المشروع نشط

---

## 📝 ملاحظات إضافية

### Environment-Specific Values

| المتغير | Development | Production |
|---------|-------------|------------|
| `FRONTEND_URL` | `http://localhost:5173` | `https://tetiano.vercel.app` |
| `BACKEND_URL` | `http://localhost:3002` | `https://tetiano-production.up.railway.app` |
| `NODE_ENV` | `development` | `production` |
| `PORT` | `3002` | `3002` |

### متغيرات Shopify (بعد الإعداد)

سيتم إضافتها لاحقاً بعد إنشاء Shopify App:
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_WEBHOOK_SECRET`

---

**آخر تحديث**: 6 مارس 2026  
**الإصدار**: 1.0.0  
**الحالة**: ✅ جاهز للاستخدام
