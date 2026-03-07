# تعليمات إعادة النشر (Redeploy)

## ✅ تم الرفع على GitHub بنجاح

Commit: `8e0ae75` - 🔧 Add debug and fix SQL scripts

## 🚀 الخطوات التالية

### 1. Railway Redeploy (Backend)

Railway سيعمل redeploy تلقائياً خلال 1-2 دقيقة.

**للتحقق:**
1. افتح: https://railway.app
2. اختار مشروع tetiano
3. اختار backend service
4. شوف "Deployments" - لازم تلاقي deployment جديد
5. انتظر حتى يكتمل (Status: Success)

**لو مش شغال تلقائياً:**
1. اضغط على الـ service
2. اضغط "Settings"
3. اضغط "Redeploy"

### 2. Vercel Redeploy (Frontend)

Vercel سيعمل redeploy تلقائياً خلال 30 ثانية - 1 دقيقة.

**للتحقق:**
1. افتح: https://vercel.com/dashboard
2. اختار مشروع tetiano
3. شوف "Deployments" - لازم تلاقي deployment جديد
4. انتظر حتى يكتمل (Status: Ready)

**لو مش شغال تلقائياً:**
1. اضغط على المشروع
2. اضغط "Deployments"
3. اضغط على آخر deployment
4. اضغط "Redeploy"

### 3. تحقق من النجاح

بعد اكتمال الـ deployments:

**Backend:**
- افتح: https://tetiano-production.up.railway.app/health
- لازم تشوف: `{"status":"ok",...}`

**Frontend:**
- افتح: https://tetiano.vercel.app
- لازم يفتح التطبيق بدون مشاكل

### 4. اختبر Shopify Connect

1. سجل دخول في التطبيق
2. اذهب لإعدادات Shopify
3. أدخل بيانات المتجر
4. اضغط "Connect"

**لو لسه في خطأ 500:**

شغل الـ debug queries:
1. `DEBUG_500_ERROR.sql` - لمعرفة المشكلة
2. `FIX_USER_STORE.sql` - لإصلاح ربط المستخدم بالـ store

## 📊 Timeline المتوقع

- ✅ Git Push: تم
- ⏳ Railway Redeploy: 1-2 دقيقة
- ⏳ Vercel Redeploy: 30 ثانية - 1 دقيقة
- ⏳ اختبار التطبيق: 1 دقيقة

**إجمالي: 3-5 دقائق**

## 🔍 استكشاف الأخطاء

### خطأ 500 لسه موجود؟

1. **تأكد من Migration 019:**
   - شغل `DEBUG_500_ERROR.sql` في Supabase
   - تأكد إن كل الجداول موجودة

2. **تأكد من Store ID:**
   - شغل `FIX_USER_STORE.sql` في Supabase
   - تأكد إن المستخدم عنده store_id

3. **شوف Railway Logs:**
   - افتح Railway Dashboard
   - اضغط على backend service
   - اضغط "View Logs"
   - دور على error messages

4. **تأكد من Environment Variables:**
   - في Railway Settings
   - تأكد من وجود:
     - SUPABASE_URL
     - SUPABASE_SERVICE_KEY
     - BACKEND_URL
     - FRONTEND_URL

## 📞 الدعم

لو لسه في مشاكل، ابعتلي:
1. نتائج `DEBUG_500_ERROR.sql`
2. آخر 20 سطر من Railway logs
3. رسالة الخطأ من المتصفح (Console)

---

**ملاحظة**: انتظر 3-5 دقائق بعد الـ push قبل الاختبار عشان الـ deployments تكتمل.
