# 🧪 دليل الاختبار المحلي - Local Testing

## 📋 المتطلبات

قبل البدء، تأكد من تثبيت:
- ✅ Node.js (v18 أو أحدث)
- ✅ npm أو yarn
- ✅ Git

---

## 🚀 خطوات التشغيل المحلي

### 1️⃣ تحديث الكود من GitHub

```bash
# إذا كنت في المجلد بالفعل
git pull origin main

# إذا كنت تستنسخ لأول مرة
git clone https://github.com/m0hammeda7mednasr-eng/tetiano.git
cd tetiano
```

---

### 2️⃣ تثبيت Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# العودة للمجلد الرئيسي
cd ..
```

---

### 3️⃣ التحقق من Environment Variables

#### Backend (.env)
```bash
# تحقق من ملف backend/.env
cat backend/.env

# يجب أن يحتوي على:
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=<القيمة الحقيقية من Supabase>
PORT=3002
NODE_ENV=development
```

#### Frontend (.env)
```bash
# تحقق من ملف frontend/.env
cat frontend/.env

# يجب أن يحتوي على:
VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3002
```

---

### 4️⃣ تشغيل Backend

```bash
# في terminal منفصل
cd backend
npm run dev

# يجب أن ترى:
# 🚀 Server running on port 3002
# 🌍 Environment: development
# 🏠 Frontend URL: http://localhost:5173
# ⏰ Scheduled jobs started
```

---

### 5️⃣ تشغيل Frontend

```bash
# في terminal آخر
cd frontend
npm run dev

# يجب أن ترى:
# VITE v5.0.8  ready in 500 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

---

### 6️⃣ فتح التطبيق

```bash
# افتح المتصفح على:
http://localhost:5173

# يجب أن تظهر صفحة Login/Signup
```

---

## 🧪 سيناريوهات الاختبار

### السيناريو 1: إنشاء أول حساب (Admin)

```bash
1. افتح http://localhost:5173
2. اضغط "إنشاء حساب جديد"
3. أدخل:
   - الاسم: Admin Test
   - البريد: admin@test.com
   - كلمة المرور: test123
4. اضغط "إنشاء الحساب"
5. يجب أن يتم توجيهك إلى Admin Dashboard
```

**التحقق من النتيجة:**
```sql
-- في Supabase SQL Editor
SELECT id, full_name, role, is_active 
FROM user_profiles 
WHERE email = 'admin@test.com';

-- يجب أن يظهر:
-- role = 'admin'
-- is_active = true
```

---

### السيناريو 2: إنشاء حساب ثاني (Staff)

```bash
1. سجل خروج من الحساب الأول
2. اضغط "إنشاء حساب جديد"
3. يجب أن تظهر رسالة: "التسجيل مغلق"
4. هذا صحيح! لأن التسجيل الذاتي متاح لأول حساب فقط
```

**لإنشاء حساب ثاني:**
```sql
-- في Supabase SQL Editor
-- قم بإنشاء المستخدم يدوياً:
-- (أو استخدم Admin Dashboard → User Management)
```

---

### السيناريو 3: اختبار Inventory

```bash
1. سجل دخول كـ Admin
2. اذهب إلى "المخزون" من القائمة
3. يجب أن تظهر رسالة "لا توجد منتجات"
4. هذا طبيعي لأن لم يتم ربط Shopify بعد
```

---

### السيناريو 4: اختبار Daily Reports

```bash
1. سجل دخول كـ Admin
2. اذهب إلى "التقارير اليومية"
3. اضغط "إنشاء تقرير جديد"
4. أدخل:
   - ما تم إنجازه اليوم: "اختبار النظام"
   - الخطة لغداً: "إكمال الاختبارات"
5. اضغط "حفظ"
6. يجب أن يظهر التقرير في القائمة
```

---

### السيناريو 5: اختبار Admin Dashboard

```bash
1. سجل دخول كـ Admin
2. يجب أن تظهر لوحة Admin Dashboard
3. تحقق من:
   - إحصائيات المستخدمين
   - إحصائيات المخزون
   - آخر التقارير
```

---

## 🔍 اختبار API Endpoints

### Health Check
```bash
curl http://localhost:3002/health

# يجب أن يرجع:
{
  "status": "ok",
  "timestamp": "2024-03-03T...",
  "uptime": 123.456,
  "environment": "development"
}
```

### Get User Profile (يحتاج Authentication)
```bash
# احصل على Access Token من Supabase
# ثم:
curl -H "Authorization: Bearer <token>" \
     http://localhost:3002/api/admin/users
```

---

## 🐛 مشاكل شائعة وحلولها

### مشكلة: Backend لا يعمل

**الأعراض:**
```
Error: Cannot find module '@supabase/supabase-js'
```

**الحل:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### مشكلة: Frontend صفحة بيضاء

**الأعراض:**
- صفحة بيضاء في المتصفح
- Console يظهر: "Missing Supabase environment variables"

**الحل:**
```bash
# تحقق من ملف frontend/.env
cat frontend/.env

# إذا كان فارغاً، انسخ من .env.example:
cp frontend/.env.example frontend/.env

# ثم عدل القيم
nano frontend/.env
```

---

### مشكلة: CORS Error

**الأعراض:**
```
Access to XMLHttpRequest at 'http://localhost:3002/api/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**الحل:**
```bash
# تأكد من أن Backend يعمل على port 3002
# تأكد من أن Frontend يعمل على port 5173
# تحقق من backend/src/index.ts:
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];
```

---

### مشكلة: Database Connection Failed

**الأعراض:**
```
Error: Failed to connect to Supabase
```

**الحل:**
```bash
1. تحقق من SUPABASE_URL صحيح
2. تحقق من SUPABASE_ANON_KEY صحيح
3. تحقق من Supabase Project مش Paused
4. جرب الاتصال من المتصفح:
   https://hgphobgcyjrtshwrnxfj.supabase.co
```

---

### مشكلة: Port Already in Use

**الأعراض:**
```
Error: listen EADDRINUSE: address already in use :::3002
```

**الحل:**
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3002 | xargs kill -9

# أو غير الـ Port في backend/.env:
PORT=3003
```

---

## 📊 Logs والمراقبة

### Backend Logs
```bash
# في terminal Backend، ستظهر:
[2024-03-03 10:30:45] INFO: HTTP Request {
  method: 'GET',
  path: '/api/inventory',
  statusCode: 200,
  duration: '45ms'
}
```

### Frontend Console
```bash
# افتح Developer Tools (F12)
# Console tab
# ستظهر أي أخطاء JavaScript
```

### Database Logs
```bash
# في Supabase Dashboard → Logs
# يمكنك رؤية:
# - API Requests
# - Database Queries
# - Authentication Events
```

---

## ✅ Checklist الاختبار

### Backend ✅
- [ ] npm install نجح
- [ ] npm run dev يعمل
- [ ] Port 3002 مفتوح
- [ ] Health endpoint يرجع OK
- [ ] Logs تظهر بدون أخطاء

### Frontend ✅
- [ ] npm install نجح
- [ ] npm run dev يعمل
- [ ] Port 5173 مفتوح
- [ ] صفحة Login تظهر
- [ ] Console بدون أخطاء

### Database ✅
- [ ] Supabase Project يعمل
- [ ] Migrations تم تطبيقها
- [ ] user_profiles table موجود
- [ ] Trigger يعمل

### Authentication ✅
- [ ] يمكن إنشاء حساب
- [ ] يمكن تسجيل الدخول
- [ ] يمكن تسجيل الخروج
- [ ] أول حساب = Admin

### Features ✅
- [ ] Dashboard يعمل
- [ ] Inventory يعمل
- [ ] Reports يعمل
- [ ] Admin Panel يعمل

---

## 🎯 الخطوة التالية

بعد التأكد من أن كل شيء يعمل محلياً:

1. ✅ اتبع خطوات ACTION_PLAN.md
2. ✅ Deploy على Railway (Backend)
3. ✅ Deploy على Vercel (Frontend)
4. ✅ اختبر Production Environment

---

## 📞 إذا واجهت مشكلة

1. تحقق من Logs في Terminal
2. تحقق من Console في المتصفح
3. تحقق من Environment Variables
4. جرب إعادة تشغيل Backend و Frontend
5. جرب `npm install` مرة أخرى

---

**التطبيق يعمل محلياً؟ رائع! 🎉**
**الآن يمكنك البدء في Deploy على Production! 🚀**
