# إصلاح طارئ - خطأ 503 و 500

## المشكلة
- ❌ خطأ 503 في `/api/app/shopify/connect`
- ❌ خطأ 500 في `/api/app/dashboard/overview`
- ❌ "Failed to generate install URL"

## السبب المحتمل
Railway Backend مش شغال صح أو في crash.

## الحل السريع

### الخطوة 1: تحقق من Railway Status

1. افتح Railway Dashboard: https://railway.app
2. اختار backend service
3. شوف الـ Status:
   - 🟢 Running = شغال
   - 🔴 Crashed = واقف
   - 🟡 Building = بيعمل build

### الخطوة 2: شوف الـ Logs

في Railway Dashboard:
1. اضغط على backend service
2. اضغط "View Logs"
3. دور على أي error messages

**ابحث عن:**
- `Error:`
- `FATAL:`
- `Cannot find module`
- `Connection refused`
- `ECONNREFUSED`

### الخطوة 3: Restart Railway Service

1. في Railway Dashboard
2. اضغط على backend service
3. اضغط على الـ 3 dots (⋮)
4. اضغط "Restart"
5. انتظر 1-2 دقيقة

### الخطوة 4: تحقق من Environment Variables

تأكد من وجود كل المتغيرات دي في Railway:

```
✅ SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
✅ SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ BACKEND_URL=https://tetiano-production.up.railway.app
✅ FRONTEND_URL=https://tetiano.vercel.app
✅ NODE_ENV=production
✅ PORT=3002
```

**مهم جداً**: تأكد إن `BACKEND_URL` و `FRONTEND_URL` مش فيهم `/` في الآخر!

## الحل البديل: إعادة Deploy من الصفر

لو المشكلة لسه موجودة:

### 1. في Railway Dashboard:

```bash
# اضغط Settings
# اضغط "Redeploy"
# أو اضغط "Restart"
```

### 2. لو لسه مش شغال، اعمل Empty Commit:

```bash
git commit --allow-empty -m "🔄 Force redeploy"
git push origin main
```

## التحقق من النجاح

بعد الـ restart/redeploy:

1. **Health Check:**
   - افتح: https://tetiano-production.up.railway.app/health
   - لازم تشوف: `{"status":"ok"}`

2. **Dashboard:**
   - افتح التطبيق: https://tetiano.vercel.app
   - سجل دخول
   - لازم الـ dashboard يفتح بدون خطأ 500

3. **Shopify Connect:**
   - جرب الاتصال بـ Shopify
   - لازم يشتغل بدون خطأ 503

## لو لسه في مشكلة

ابعتلي:
1. آخر 50 سطر من Railway logs
2. رسالة الخطأ الكاملة من Console
3. screenshot من Railway Dashboard (Status)

---

**ملاحظة**: خطأ 503 معناه إن الـ service مش متاح. غالباً بسبب crash أو restart.
