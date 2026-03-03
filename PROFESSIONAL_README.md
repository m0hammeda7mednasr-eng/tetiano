# 🚀 نظام إدارة المخزون المتعدد العلامات – Inventory Management System

> نظام احترافي متكامل لإدارة المخزون وتتبع المبيعات مع تكامل Shopify الكامل

## ✨ الميزات الرئيسية

### 📦 إدارة المخزون

- ✅ مزامنة تلقائية مع Shopify
- ✅ تتبع مستويات المخزون في الوقت الفعلي
- ✅ تعديلات يدوية مع سجل تدقيق كامل
- ✅ تحذيرات المخزون المنخفض

### 🛒 إدارة الطلبات

- ✅ تتبع الطلبات المتزامن
- ✅ معالجة الاسترجاعات التلقائية
- ✅ تحديثات المخزون الفوري

### 👥 إدارة الفرق

- ✅ 4 أدوار مختلفة (مسؤول، مدير، مشغل، عارض)
- ✅ التحكم في الوصول على مستوى العلامة التجارية
- ✅ إدارة الصلاحيات المرنة

### 📊 التقارير

- ✅ تقارير يومية للفرق
- ✅ تنبيهات مجدولة تلقائياً
- ✅ تحليلات شاملة للمخزون

### 🔐 الأمان

- ✅ JWT Authentication
- ✅ Row Level Security (RLS)
- ✅ HMAC Verification للـ Webhooks
- ✅ CSRF Protection

## 🏗️ البنية التقنية

```
Frontend (React 18)  ←→  Backend (Node.js)  ←→  Database (PostgreSQL)
   Port 5173          Port 3002             Supabase
   Vite + Tailwind    Express + TypeScript  RLS Policies
```

## 🚀 البدء السريع

### المتطلبات

- **Node.js**: v18+
- **npm** أو **yarn**
- حساب **Supabase**
- متجر **Shopify** (اختياري)

### التثبيت

```bash
# 1. استنساخ المشروع
git clone <repository-url>
cd inventory-management

# 2. تثبيت Frontend
cd frontend
npm install
npm run dev

# 3. تثبيت Backend (في تر منفصل)
cd backend
npm install
npm run dev
```

### الإعدادات

#### 1. قاعدة البيانات

```bash
# في Supabase SQL Editor، شغّل:
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_rls_policies.sql
3. supabase/migrations/003_seed_data.sql
4. supabase/migrations/004_add_last_sync_at.sql
5. supabase/migrations/005_shopify_oauth.sql
6. supabase/migrations/006_rbac_teams.sql
7. supabase/migrations/007_brands_api_creds.sql
```

#### 2. المتغيرات البيئية

**Backend** (`.env`):

```dotenv
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_KEY=your-key
SHOPIFY_REDIRECT_URI=http://localhost:3002/api/shopify/callback
PORT=3002
NODE_ENV=development
```

**Frontend** (`.env`):

```dotenv
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_API_URL=http://localhost:3002
```

## 📁 هيكل المشروع

```
.
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # مكونات معاد استخدامها
│   │   ├── pages/           # صفحات التطبيق
│   │   ├── lib/             # مكتبات مساعدة
│   │   ├── store/           # Zustand stores
│   │   └── App.tsx          # التطبيق الرئيسي
│   └── package.json
│
├── backend/                  # Express Backend
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # منطق العمل
│   │   ├── middleware/      # Auth, Error, Rate Limit
│   │   ├── config/          # Supabase, Shopify
│   │   ├── utils/           # مساعدات
│   │   └── index.ts         # نقطة الدخول
│   └── package.json
│
└── supabase/                 # Database
    └── migrations/           # SQL migrations
```

## 🔌 API Endpoints

### المخزون

- `GET /api/inventory` - قائمة المنتجات
- `GET /api/inventory/:id` - تفاصيل المنتج
- `POST /api/inventory/:id/adjust` - تعديل المخزون
- `GET /api/inventory/:id/movements` - سجل الحركات

### التقارير

- `GET /api/reports` - قائمة التقارير
- `POST /api/reports` - إنشاء تقرير جديد
- `GET /api/reports/:id` - تفاصيل التقرير

### الفرق

- `GET /api/teams` - قائمة الفرق
- `POST /api/teams` - إنشاء فريق
- `GET /api/teams/:id` - تفاصيل الفريق
- `PATCH /api/teams/:id` - تحديث الفريق

### Shopify

- `GET /api/shopify/auth?shop=...&brand_id=...` - بدء OAuth
- `GET /api/shopify/callback` - استقبال callback
- `GET /api/shopify/status/:brandId` - حالة الاتصال
- `DELETE /api/shopify/disconnect/:brandId` - فصل المتجر

### Admin

- `GET /api/admin/users` - قائمة المستخدمين
- `POST /api/admin/users` - إنشاء مستخدم
- `PATCH /api/admin/users/:id` - تحديث مستخدم
- `GET /api/admin/teams` - إدارة الفرق

## 🔐 نموذج الأمان

### الأدوار (Roles)

| الدور        | الصلاحيات                       |
| ------------ | ------------------------------- |
| **Admin**    | كل شيء                          |
| **Manager**  | إدارة الفريق والمخزون والتقارير |
| **Operator** | تعديل المخزون والتقارير         |
| **Viewer**   | عرض فقط                         |

### Row Level Security

جميع الجداول محمية بـ RLS policies

## 📚 التوثيق

- [API Documentation](docs/api.md)
- [Architecture Guide](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [Shopify Setup](docs/shopify-oauth-setup.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🐛 استكشاف الأخطاء

### الخادم لا يبدأ

```bash
# تحقق من المتغيرات البيئية
echo $SUPABASE_URL

# تحقق من البوابات
lsof -i :3002  # Backend
lsof -i :5173  # Frontend
```

### خطأ في الاتصال بـ Supabase

```bash
# تحقق من key و URL
curl https://xxx.supabase.co/rest/v1/brands \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### مشاكل OAuth

1. تأكد من Redirect URI الصحيح
2. تحقق من API credentials
3. اختبر في بيئة إنتاج

## 🚢 النشر

### Frontend (Vercel)

```bash
npm run build
vercel deploy
```

### Backend (Render)

```bash
# في Render
- Branch: main
- Build Command: npm run build
- Start Command: npm start
```

## 📊 الإحصائيات

| المقياس         | القيمة     |
| --------------- | ---------- |
| Backend Code    | ~3,500 سطر |
| Frontend Code   | ~2,800 سطر |
| Database Schema | ~1,200 سطر |
| API Endpoints   | 30+        |
| Database Tables | 13         |
| Frontend Pages  | 15         |

## 📝 الترخيص

MIT License - انظر LICENSE الملف

## 👥 المساهمون

تم تطوير هذا المشروع بواسطة فريق محترف.

## 📧 التواصل

للدعم أو الأسئلة:

- Email: support@example.com
- Issues: GitHub Issues
- Docs: [الوثائق الكاملة](docs/)

---

<p align="center">
  مع ❤️ من فريق التطوير
</p>
