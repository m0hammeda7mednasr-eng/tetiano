# 🏪 Tetiano Inventory Management System

نظام إدارة مخزون احترافي متكامل مع Shopify، مصمم خصيصاً لإدارة متاجر متعددة بكفاءة عالية.

[![Production Status](https://img.shields.io/badge/Status-95%25%20Ready-yellow)](https://tetiano.vercel.app)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://tetiano.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-purple)](https://tetiano-production.up.railway.app)
[![Database](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com)

---

## 📋 جدول المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [الميزات الرئيسية](#-الميزات-الرئيسية)
- [التقنيات المستخدمة](#-التقنيات-المستخدمة)
- [البنية المعمارية](#-البنية-المعمارية)
- [التثبيت والإعداد](#-التثبيت-والإعداد)
- [النشر على Production](#-النشر-على-production)
- [الوثائق](#-الوثائق)
- [الحالة الحالية](#-الحالة-الحالية)

---

## 🎯 نظرة عامة

Tetiano هو نظام إدارة مخزون شامل يربط متاجر Shopify المتعددة في منصة واحدة، مع:

- ✅ إدارة مستخدمين وفرق بصلاحيات متقدمة
- ✅ ربط متاجر Shopify عبر OAuth
- ✅ مزامجة تلقائية للمنتجات والمخزون
- ✅ تقارير يومية وإحصائيات تفصيلية
- ✅ إدارة الأوردرات والإشعارات
- ✅ سجلات تدقيق شاملة (Audit Logs)
- ✅ واجهة مستخدم عربية احترافية

---

## ✨ الميزات الرئيسية

### 🔐 إدارة المستخدمين والصلاحيات
- نظام أدوار متقدم (Admin, Manager, Staff)
- إدارة فرق مع صلاحيات مخصصة
- تحكم دقيق في الوصول للعلامات التجارية
- سجلات تدقيق لجميع العمليات

### 🛍️ تكامل Shopify
- ربط متاجر متعددة عبر OAuth
- مزامجة تلقائية للمنتجات والمخزون
- استقبال Webhooks في الوقت الفعلي
- إدارة الأوردرات والمنتجات

### 📊 التقارير والإحصائيات
- تقارير يومية تلقائية
- إحصائيات مفصلة للمبيعات والمخزون
- تنبيهات للمخزون المنخفض
- تحليلات الأداء

### 📦 إدارة المخزون
- تتبع المخزون في الوقت الفعلي
- تعديلات المخزون مع سجل كامل
- تنبيهات تلقائية
- مزامجة ثنائية الاتجاه مع Shopify

---

## 🛠️ التقنيات المستخدمة

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool سريع
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** + **Express**
- **TypeScript**
- **Supabase** - Database & Auth
- **Node-cron** - Scheduled jobs
- **Winston** - Logging

### Infrastructure
- **Vercel** - Frontend hosting
- **Railway** - Backend hosting
- **Supabase** - PostgreSQL database
- **GitHub** - Version control

---

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                     │
│  React + TypeScript + Tailwind CSS + Zustand            │
│  https://tetiano.vercel.app                             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST API
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Railway)                      │
│  Node.js + Express + TypeScript                         │
│  https://tetiano-production.up.railway.app              │
└────────────┬───────────────────────┬────────────────────┘
             │                       │
             │ Supabase Client       │ Shopify API
             ▼                       ▼
┌────────────────────────┐  ┌──────────────────────────┐
│  Database (Supabase)   │  │   Shopify Stores         │
│  PostgreSQL + Auth     │  │   OAuth + Webhooks       │
│  + RLS Policies        │  │   Multiple Brands        │
└────────────────────────┘  └──────────────────────────┘
```

---

## 🚀 التثبيت والإعداد

### المتطلبات الأساسية

- Node.js 18+ و npm
- حساب Supabase
- حساب Shopify Partner (للتكامل)

### 1. Clone المشروع

```bash
git clone https://github.com/your-username/tetiano.git
cd tetiano
```

### 2. إعداد Backend

```bash
cd backend
npm install

# انسخ ملف البيئة
cp .env.example .env

# عدّل .env وأضف:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_KEY (من Supabase Dashboard)
# - FRONTEND_URL=http://localhost:5173
# - BACKEND_URL=http://localhost:3002

# شغّل Backend
npm run dev
```

### 3. إعداد Frontend

```bash
cd frontend
npm install

# انسخ ملف البيئة
cp .env.example .env

# عدّل .env وأضف:
# - VITE_API_URL=http://localhost:3002
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY

# شغّل Frontend
npm run dev
```

### 4. إعداد Database

```bash
# افتح Supabase Dashboard
# اذهب إلى SQL Editor
# نفذ الملفات في supabase/migrations/ بالترتيب
```

---

## 🌐 النشر على Production

### الحالة الحالية

| المكون | الحالة | URL |
|--------|--------|-----|
| Frontend | ✅ يعمل | https://tetiano.vercel.app |
| Backend | 🟡 يحتاج إصلاح | https://tetiano-production.up.railway.app |
| Database | ✅ جاهز | Supabase |

### المشكلة الحالية

Backend يحتاج تحديث `SUPABASE_SERVICE_KEY` في Railway. راجع [PRODUCTION_STATUS_REPORT.md](./PRODUCTION_STATUS_REPORT.md) للتفاصيل الكاملة.

### خطوات النشر

#### 1. Frontend على Vercel

```bash
# تم النشر بالفعل على:
https://tetiano.vercel.app

# Environment Variables المطلوبة:
VITE_API_URL=https://tetiano-production.up.railway.app
VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

#### 2. Backend على Railway

```bash
# تم النشر بالفعل على:
https://tetiano-production.up.railway.app

# Environment Variables المطلوبة:
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc... (⚠️ يحتاج تحديث!)
FRONTEND_URL=https://tetiano.vercel.app
BACKEND_URL=https://tetiano-production.up.railway.app
API_URL=https://tetiano-production.up.railway.app
PORT=3002
NODE_ENV=production
TZ=Africa/Cairo
```

#### 3. Database على Supabase

```bash
# تم الإعداد بالفعل
# Project: hgphobgcyjrtshwrnxfj
# URL: https://hgphobgcyjrtshwrnxfj.supabase.co
```

---

## 📚 الوثائق

### الوثائق الرئيسية

- [📊 تقرير الوضع الإنتاجي](./PRODUCTION_STATUS_REPORT.md) - الحالة الحالية والمشاكل
- [🔧 دليل المتغيرات البيئية](./ENVIRONMENT_VARIABLES_GUIDE.md) - شرح شامل للمتغيرات
- [🛍️ دليل ربط Shopify](./SHOPIFY_OAUTH_SETUP.md) - خطوات ربط المتاجر
- [📋 خطة العمل](./ACTION_PLAN.md) - خطوات الإصلاح والتشغيل

### الوثائق التقنية

- [🏗️ معمارية النظام](./docs/architecture.md)
- [📡 توثيق API](./docs/api.md)
- [🚀 دليل النشر](./docs/deployment.md)
- [🔍 استكشاف الأخطاء](./docs/troubleshooting.md)

---

## 📊 الحالة الحالية

### نسبة الإنجاز: 95% ✅

| المكون | الحالة | النسبة |
|--------|--------|--------|
| Frontend Code | ✅ جاهز | 100% |
| Backend Code | ✅ جاهز | 100% |
| Backend Deploy | 🟡 يحتاج تحديث | 90% |
| Database | ✅ جاهز | 100% |
| CORS | ✅ يعمل | 100% |
| OAuth Flow | ✅ جاهز | 100% |
| Webhooks | ✅ جاهز | 100% |
| Documentation | ✅ كامل | 100% |

### المشكلة الوحيدة

**500 Internal Server Errors** على بعض endpoints بسبب:
- `SUPABASE_SERVICE_KEY` في Railway غير صحيح أو مفقود

### الحل

1. احصل على `service_role` key من Supabase Dashboard
2. حدّث المتغير في Railway
3. أعد Deploy

راجع [PRODUCTION_STATUS_REPORT.md](./PRODUCTION_STATUS_REPORT.md) للتفاصيل الكاملة.

---

## 🔐 الأمان

- ✅ RLS Policies مفعّلة على جميع الجداول
- ✅ JWT Authentication عبر Supabase
- ✅ CORS محدد للنطاقات المسموحة
- ✅ Rate limiting على API endpoints
- ✅ HMAC verification للـ Webhooks
- ✅ Audit logs لجميع العمليات الحساسة

---

## 🤝 المساهمة

المشروع حالياً في مرحلة Production. للمساهمة:

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

---

## 📝 الترخيص

هذا المشروع ملكية خاصة. جميع الحقوق محفوظة.

---

## 📞 الدعم

للدعم والاستفسارات:

- 📧 Email: support@tetiano.com
- 🌐 Website: https://tetiano.vercel.app
- 📚 Documentation: [docs/](./docs/)

---

## 🎉 شكر خاص

تم بناء هذا النظام باستخدام أفضل الممارسات والتقنيات الحديثة لضمان:
- ⚡ أداء عالي
- 🔒 أمان قوي
- 📱 تجربة مستخدم ممتازة
- 🌍 دعم كامل للغة العربية

---

**آخر تحديث**: 6 مارس 2026  
**الإصدار**: 1.0.0  
**الحالة**: 🟡 95% جاهز - يحتاج إصلاح بسيط
