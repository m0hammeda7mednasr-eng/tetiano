# Tetiano - نظام إدارة المخزون المتكامل

نظام شامل لإدارة المخزون مع تكامل Shopify، مصمم للشركات التي تدير عدة علامات تجارية.

## المميزات الرئيسية

- 🏪 **تكامل Shopify**: مزامنة تلقائية للمنتجات والطلبات والمخزون
- 📊 **إدارة متعددة المتاجر**: دعم عدة متاجر وعلامات تجارية
- 👥 **نظام صلاحيات متقدم**: أدوار ومستويات وصول مخصصة
- 📦 **تتبع المخزون**: متابعة حركة المخزون في الوقت الفعلي
- 📈 **تقارير وتحليلات**: تقارير يومية وإحصائيات مفصلة
- 🔔 **إشعارات تلقائية**: تنبيهات عند نفاد المخزون

## التقنيات المستخدمة

### Backend
- Node.js + Express + TypeScript
- Supabase (PostgreSQL + Auth)
- Shopify Admin API
- Bull Queue للمهام المجدولة

### Frontend
- React + TypeScript
- Vite
- TailwindCSS
- React Query

## البدء السريع

### 1. المتطلبات

- Node.js 18+
- حساب Supabase
- حساب Shopify Partner (للتكامل)

### 2. التثبيت

```bash
# استنساخ المشروع
git clone <repository-url>
cd tetiano

# تثبيت dependencies للـ backend
cd backend
npm install

# تثبيت dependencies للـ frontend
cd ../frontend
npm install
```

### 3. الإعداد

1. انسخ `.env.example` إلى `.env` في مجلد backend
2. املأ المتغيرات المطلوبة (Supabase, Shopify)
3. شغل migrations في Supabase (ابدأ من `019_final_production_fix.sql`)

### 4. التشغيل المحلي

```bash
# Backend
cd backend
npm run dev

# Frontend (في terminal آخر)
cd frontend
npm run dev
```

## النشر على Production

### Backend (Railway)
1. اربط المشروع بـ Railway
2. اضبط Environment Variables
3. Railway سيعمل deploy تلقائي

### Frontend (Vercel)
1. اربط المشروع بـ Vercel
2. اضبط Environment Variables
3. Vercel سيعمل deploy تلقائي

### Database (Supabase)
1. شغل migration 019 في SQL Editor
2. تأكد من إنشاء stores للمستخدمين

راجع `SETUP_GUIDE.md` للتفاصيل الكاملة.

## الهيكل

```
tetiano/
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Auth, validation
│   │   └── utils/     # Helpers
│   └── package.json
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── hooks/
│   └── package.json
├── supabase/
│   └── migrations/    # Database migrations
└── docs/              # Documentation
```

## الوثائق

- [دليل الإعداد](SETUP_GUIDE.md)
- [دليل الـ API](docs/api.md)
- [البنية المعمارية](docs/architecture.md)
- [دليل النشر](docs/deployment.md)
- [إعداد Shopify OAuth](docs/shopify-oauth-setup.md)

## المساهمة

راجع [CONTRIBUTING.md](CONTRIBUTING.md) لمعرفة كيفية المساهمة في المشروع.

## الترخيص

MIT License - راجع [LICENSE](LICENSE) للتفاصيل.

## الدعم

للمشاكل والأسئلة، افتح issue في GitHub أو راسلنا.
