# 🚨 حل مشكلة 500 Errors - خطوات سريعة

**الوقت المتوقع**: 10 دقائق  
**الأولوية**: 🔴 عالية جداً

---

## 🎯 المشكلة

```
GET /api/admin/teams - 500 ❌
GET /api/admin/users - 500 ❌
POST /api/shopify/get-install-url - 500 ❌
```

**السبب**: مشكلة في Railway Environment Variables

---

## ✅ الحل - 3 خطوات فقط

### الخطوة 1: افتح Railway Dashboard (دقيقة واحدة)

```
1. اذهب إلى: https://railway.app
2. سجل دخول
3. اختر المشروع: tetiano-production
4. اضغط على Backend service
5. اذهب إلى Variables tab
```

---

### الخطوة 2: تحقق من المتغيرات (5 دقائق)

#### أ) تحقق من SUPABASE_SERVICE_KEY

**المطلوب:**
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5ODA1NCwiZXhwIjoyMDg3ODc0MDU0fQ.Ip8txSkRkgVXNZ4FEEnSqUTVYisV2SiA8ozbynVq3bg
```

**كيف تتحقق:**
1. في Railway Variables، افتح SUPABASE_SERVICE_KEY
2. تأكد أنه يبدأ بـ `eyJhbGc...`
3. تأكد أنه **service_role** key (ليس anon!)
4. للتأكد: اذهب إلى Supabase Dashboard → Settings → API
5. قارن مع **service_role** key

**إذا كان خطأ:**
- انسخ service_role key من Supabase
- الصقه في Railway
- احفظ

---

#### ب) أضف BACKEND_URL (إذا لم يكن موجوداً)

**المطلوب:**
```
BACKEND_URL=https://tetiano-production.up.railway.app
```

**كيف تضيفه:**
1. في Railway Variables، اضغط **New Variable**
2. Key: `BACKEND_URL`
3. Value: `https://tetiano-production.up.railway.app`
4. احفظ

---

#### ج) تحقق من FRONTEND_URL

**المطلوب:**
```
FRONTEND_URL=https://tetiano.vercel.app
```

**أو:**
```
FRONTEND_URL=https://tetiano-git-main-mohs-projects-0b03337a.vercel.app
```

**إذا كان مختلفاً:**
- حدّثه للقيمة الصحيحة
- احفظ

---

### الخطوة 3: انتظر Deploy (3 دقائق)

```
1. Railway سيعيد Deploy تلقائياً
2. انتظر 2-3 دقائق
3. اذهب إلى Deployments tab
4. تأكد من: Status = Success ✅
```

---

## 🧪 اختبار (دقيقة واحدة)

### 1. Health Check

افتح في المتصفح:
```
https://tetiano-production.up.railway.app/health
```

**يجب أن يرجع:**
```json
{"status":"ok"}
```

### 2. اختبر الموقع

```
1. افتح: https://tetiano.vercel.app
2. سجل دخول
3. اذهب إلى: Admin → Shopify Settings
4. يجب أن تظهر بدون errors ✅
```

---

## 📋 Checklist السريع

- [ ] فتحت Railway Dashboard
- [ ] تحققت من SUPABASE_SERVICE_KEY (service_role)
- [ ] أضفت BACKEND_URL
- [ ] تحققت من FRONTEND_URL
- [ ] انتظرت Deploy
- [ ] اختبرت Health Check
- [ ] اختبرت الموقع

---

## 🎉 بعد الإصلاح

بعد نجاح الاختبار:

1. ✅ جرب ربط متجر Shopify
2. ✅ اختبر OAuth Flow
3. ✅ فعّل Webhooks

---

## 📞 إذا استمرت المشكلة

### تحقق من Railway Logs:

```
1. Railway Dashboard → Logs
2. ابحث عن:
   - "Missing Supabase environment variables" ❌
   - "Supabase connection failed" ❌
   - "Server running on port 3002" ✅
```

### إذا وجدت errors:

اقرأ الملفات التفصيلية:
- `RAILWAY_ENV_CHECK.md` - دليل مفصل
- `CURRENT_SITUATION_ANALYSIS.md` - تحليل شامل
- `ENVIRONMENT_VARIABLES_GUIDE.md` - دليل المتغيرات

---

## 🔑 ملاحظة مهمة

**الفرق بين المفاتيح:**

| المفتاح | أين؟ | الاستخدام |
|---------|------|-----------|
| `anon` key | Frontend (Vercel) | عام - آمن |
| `service_role` key | Backend (Railway) | سري - خطير |

**⚠️ لا تخلط بينهم!**

---

**آخر تحديث**: 6 مارس 2026  
**الحالة**: ✅ جاهز للتنفيذ
