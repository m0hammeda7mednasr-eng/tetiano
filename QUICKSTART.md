# ⚡ البدء السريع (5 دقائق)

> البدء بسرعة مع المشروع محلياً في 5 خطوات

## 🚀 الخطوات السريعة

### 1️⃣ استنساخ وتثبيت (2 دقيقة)

```bash
# استنساخ المشروع
git clone <your-repo-url>
cd tetiano

# تثبيت Backend
cd backend
npm install

# تثبيت Frontend (في تر منفصل)
cd ../frontend
npm install
```

### 2️⃣ إعداد المتغيرات البيئية (1 دقيقة)

**Backend** - انشئ `backend/.env`:

```dotenv
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** - انشئ `frontend/.env`:

```dotenv
VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3002
```

### 3️⃣ تشغيل قاعدة البيانات (1 دقيقة)

```bash
# افتح Supabase Dashboard
# اذهب إلى: https://app.supabase.com/project/hgphobgcyjrtshwrnxfj

# SQL Editor → انسخ والصق كل ملف:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
# 3. supabase/migrations/003_seed_data.sql
```

### 4️⃣ تشغيل التطبيقين

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# ✅ يجب أن ترى "Server running on port 3002"
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
# ✅ يجب أن ترى "Local:   http://localhost:5173/"
```

### 5️⃣ اختبار الدخول

افتح المتصفح: **http://localhost:5173**

**حساب تجريبي:**

```
البريد: admin@example.com
كلمة المرور: password123
```

## ✅ التحقق من الحالة

### Backend Health

```bash
curl http://localhost:3002/health
```

**الرد الصحيح:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-02T...",
  "uptime": 12.345,
  "environment": "development"
}
```

### Frontend Loading

تحقق من عدم وجود أخطاء في Console:

- افتح Developer Tools (F12)
- انظر إلى Console tab
- يجب أن تكون خالية من الأخطاء الحمراء

## 🎯 الصفحات الأساسية

| الصفحة      | URL                             | الدور المطلوب |
| ----------- | ------------------------------- | ------------- |
| لوحة التحكم | http://localhost:5173           | أي مستخدم     |
| المخزون     | http://localhost:5173/inventory | Operator+     |
| الطلبات     | http://localhost:5173/orders    | Operator+     |
| التقارير    | http://localhost:5173/reports   | Operator+     |
| الإعدادات   | http://localhost:5173/settings  | أي مستخدم     |
| لوحة Admin  | http://localhost:5173/admin     | Admin فقط     |

## 🔧 الأوامر المفيدة

### Backend

```bash
# تطوير مع إعادة تحميل
npm run dev

# البناء
npm run build

# التشغيل المباشر
npm start

# تنقية الكود
npm run lint
```

### Frontend

```bash
# تطوير
npm run dev

# البناء للإنتاج
npm run build

# معاينة البناء
npm run preview

# التحقق من الأخطاء
npm run lint
```

## 🆘 حل المشاكل الشائعة

### ❌ "Connection refused" - Backend

```bash
# تحقق من المنفذ
lsof -i :3002

# الحل
npm run dev  # من مجلد backend
```

### ❌ "Cannot find module" - Frontend/Backend

```bash
# إعادة تثبيت المكتبات
rm -rf node_modules package-lock.json
npm install
```

### ❌ "SUPABASE_URL is missing"

```bash
# تحقق من ملف .env
cat backend/.env

# أضف المتغيرات الناقصة
# تأكد من عدم وجود مسافات
```

### ❌ "CORS Error"

```bash
# تحقق من FRONTEND_URL في backend/.env
FRONTEND_URL=http://localhost:5173

# أعد تشغيل Backend
# اضغط Ctrl+C ثم npm run dev
```

## 📊 معلومات مهمة

- **Backend API**: `http://localhost:3002/api`
- **Frontend**: `http://localhost:5173`
- **Supabase URL**: `https://hgphobgcyjrtshwrnxfj.supabase.co`
- **API Docs**: [docs/api.md](docs/api.md)

## 🎓 الخطوات التالية

بعد البدء السريع:

1. **اقرأ التوثيق**
   - [README الكامل](README.md)
   - [دليل المعمارية](docs/architecture.md)

2. **اختبر الميزات**
   - إضافة منتج
   - تعديل المخزون
   - إنشاء تقرير

3. **اعرف البنية**
   - استكشف `frontend/src` و `backend/src`
   - اقرأ التعليقات في الكود

## 🚀 النشر

عندما تكون جاهزاً:

```bash
# قراءة دليل النشر
cat PRODUCTION_DEPLOYMENT.md

# أو (للـ Production)
npm run build
```

---

<div align="center">

**مبروك! 🎉 المشروع يعمل بنجاح!**

لأي مساعدة: اقرأ [المستندات](docs/) أو [البحث عن الحل](docs/troubleshooting.md)

</div>
