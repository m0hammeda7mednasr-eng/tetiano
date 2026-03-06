# 🔍 فحص Railway Environment Variables - خطوة بخطوة

**التاريخ**: 6 مارس 2026  
**الحالة**: دليل التحقق من الإعداد

---

## 🎯 الهدف

التأكد من أن جميع Environment Variables موجودة وصحيحة في Railway لحل مشكلة 500 errors.

---

## ✅ الخطوة 1: التحقق من المتغيرات الموجودة

حسب المعلومات المتوفرة، لديك المتغيرات التالية في Railway:

```env
✅ FRONTEND_URL=******* (موجود)
✅ NODE_ENV=production (موجود)
✅ PORT=3002 (موجود)
✅ SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (موجود)
✅ SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (موجود)
✅ SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co (موجود)
```

---

## 🔴 المشكلة المحتملة

على الرغم من وجود المتغيرات، هناك احتمالات للمشكلة:

### 1. SUPABASE_SERVICE_KEY خطأ
- قد يكون `anon` key بدلاً من `service_role` key
- قد يكون منتهي الصلاحية
- قد يكون من مشروع Supabase مختلف

### 2. BACKEND_URL مفقود
- الكود يحتاج `BACKEND_URL` أو `API_URL`
- حالياً غير موجود في القائمة

### 3. FRONTEND_URL مخفي
- القيمة مخفية (*******) - يجب التأكد من صحتها

---

## 🔧 الحل: التحقق والتحديث

### الخطوة 1: افتح Railway Dashboard

1. اذهب إلى: https://railway.app
2. سجل دخول
3. اختر المشروع: **tetiano-production**
4. اضغط على **Backend service**
5. اذهب إلى تبويب **Variables**

### الخطوة 2: تحقق من SUPABASE_SERVICE_KEY

**كيف تعرف أنه صحيح؟**

1. يجب أن يبدأ بـ: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
2. يجب أن يكون **service_role** key (ليس anon!)
3. للتحقق:
   - اذهب إلى Supabase Dashboard
   - Settings → API
   - قارن مع **service_role** key (ليس anon!)

**إذا كان خطأ:**
```
1. انسخ service_role key من Supabase
2. في Railway Variables، اضغط على SUPABASE_SERVICE_KEY
3. الصق القيمة الجديدة
4. احفظ
```

### الخطوة 3: أضف BACKEND_URL

**إذا لم يكن موجوداً:**

1. في Railway Variables، اضغط **New Variable**
2. Key: `BACKEND_URL`
3. Value: `https://tetiano-production.up.railway.app`
4. احفظ

**أو أضف API_URL:**

1. Key: `API_URL`
2. Value: `https://tetiano-production.up.railway.app`
3. احفظ

### الخطوة 4: تحقق من FRONTEND_URL

**يجب أن يكون:**
```
FRONTEND_URL=https://tetiano.vercel.app
```

**أو:**
```
FRONTEND_URL=https://tetiano-git-main-mohs-projects-0b03337a.vercel.app
```

**إذا كان مختلفاً:**
1. حدّثه للقيمة الصحيحة
2. احفظ

---

## 📋 القائمة النهائية المطلوبة

بعد التحديث، يجب أن تكون لديك:

```env
# ═══════════════════════════════════════════════════════════
# Supabase (حرج جداً)
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5ODA1NCwiZXhwIjoyMDg3ODc0MDU0fQ.Ip8txSkRkgVXNZ4FEEnSqUTVYisV2SiA8ozbynVq3bg
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTgwNTQsImV4cCI6MjA4Nzg3NDA1NH0.0lH6_OkPXvYb1PokkudAipBxaenwrmwPu5tk60sYqVU

# ═══════════════════════════════════════════════════════════
# URLs (مهم)
# ═══════════════════════════════════════════════════════════
FRONTEND_URL=https://tetiano.vercel.app
BACKEND_URL=https://tetiano-production.up.railway.app
API_URL=https://tetiano-production.up.railway.app

# ═══════════════════════════════════════════════════════════
# Server (موصى به)
# ═══════════════════════════════════════════════════════════
PORT=3002
NODE_ENV=production
```

---

## 🚀 الخطوة 5: إعادة Deploy

بعد تحديث المتغيرات:

1. **Railway سيعيد Deploy تلقائياً** عند حفظ المتغيرات
2. انتظر 2-3 دقائق
3. اذهب إلى تبويب **Deployments**
4. تأكد من أن آخر deployment = **Success** ✅

---

## 🧪 الخطوة 6: اختبار

### اختبار 1: Health Check

افتح في المتصفح:
```
https://tetiano-production.up.railway.app/health
```

**يجب أن يرجع:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-06T...",
  "uptime": 123.45
}
```

### اختبار 2: تحقق من Logs

1. في Railway Dashboard
2. اذهب إلى **Logs**
3. ابحث عن:
   - ✅ `Server running on port 3002`
   - ✅ `Supabase client initialized`
   - ❌ `Missing Supabase environment variables`
   - ❌ `Supabase connection failed`

### اختبار 3: اختبار API

افتح الموقع:
```
https://tetiano.vercel.app
```

1. سجل دخول كـ Admin
2. اذهب إلى **Admin → Shopify Settings**
3. يجب أن تظهر الصفحة **بدون errors**
4. افتح Console (F12)
5. تحقق من عدم وجود 500 errors

---

## 🔍 استكشاف الأخطاء

### إذا استمرت 500 errors بعد التحديث:

#### 1. تحقق من Railway Logs

```bash
# ابحث عن:
"Missing Supabase environment variables"
"Supabase connection failed"
"Invalid service key"
"Database error"
```

**إذا وجدت "Missing Supabase environment variables":**
- المتغيرات غير موجودة أو الأسماء خطأ
- تأكد من الأسماء بالضبط (case-sensitive)

**إذا وجدت "Invalid service key":**
- SUPABASE_SERVICE_KEY خطأ
- تأكد من أنه service_role key (ليس anon!)

#### 2. تحقق من Supabase Dashboard

1. اذهب إلى Supabase Dashboard
2. Settings → API
3. تأكد من:
   - Project URL = `https://hgphobgcyjrtshwrnxfj.supabase.co`
   - service_role key يطابق ما في Railway

#### 3. اختبر الاتصال مباشرة

في Railway Logs، ابحث عن:
```
"Supabase client initialized successfully"
```

إذا لم تجده:
- المشكلة في الاتصال بـ Supabase
- تحقق من المفاتيح مرة أخرى

---

## 📊 Checklist النهائي

### قبل إعادة Deploy:
- [ ] SUPABASE_URL صحيح
- [ ] SUPABASE_SERVICE_KEY = service_role key (ليس anon!)
- [ ] SUPABASE_ANON_KEY موجود
- [ ] FRONTEND_URL صحيح
- [ ] BACKEND_URL أو API_URL موجود
- [ ] PORT=3002
- [ ] NODE_ENV=production

### بعد إعادة Deploy:
- [ ] Deployment = Success
- [ ] Logs بدون errors
- [ ] Health check يعمل
- [ ] الموقع يفتح بدون 500 errors
- [ ] Shopify Settings تظهر بشكل صحيح

---

## 🎯 الخطوات التالية

بعد حل مشكلة 500 errors:

1. ✅ اختبار OAuth Flow
2. ✅ ربط متجر Shopify تجريبي
3. ✅ تفعيل Webhooks
4. ✅ اختبار المزامجة

---

## 📞 إذا احتجت مساعدة

### معلومات مهمة للدعم:

**Railway Project:**
- URL: `https://tetiano-production.up.railway.app`
- Service: Backend

**Supabase Project:**
- URL: `https://hgphobgcyjrtshwrnxfj.supabase.co`
- Project: tetiano

**Frontend:**
- URL: `https://tetiano.vercel.app`
- Preview: `https://tetiano-git-main-mohs-projects-0b03337a.vercel.app`

---

## 🔑 ملاحظات مهمة جداً

### ⚠️ الفرق بين المفاتيح:

| المفتاح | الاستخدام | يبدأ بـ | أين؟ |
|---------|-----------|---------|------|
| `anon` key | Frontend | `eyJhbGc...` | Vercel |
| `service_role` key | Backend | `eyJhbGc...` | Railway |

### ⚠️ لا تخلط بينهم!

- ❌ **لا تستخدم** anon key في Backend
- ❌ **لا تستخدم** service_role key في Frontend
- ✅ **استخدم** service_role في Railway فقط
- ✅ **استخدم** anon في Vercel فقط

---

**آخر تحديث**: 6 مارس 2026  
**الحالة**: ✅ جاهز للتنفيذ
