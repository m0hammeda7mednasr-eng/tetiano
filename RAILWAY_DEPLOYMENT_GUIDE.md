# 🚂 دليل نشر Backend على Railway

## 📋 الخطوات:

### 1️⃣ إنشاء حساب على Railway

1. **اذهب إلى:** https://railway.app/
2. **Sign up with GitHub**
3. **Authorize Railway** للوصول لحسابك

---

### 2️⃣ إنشاء Project جديد

1. **Dashboard → New Project**
2. **Deploy from GitHub repo**
3. **اختار:** `m0hammeda7mednasr-eng/tetiano`
4. **Add variables** (مهم جداً!)

---

### 3️⃣ إعدادات المشروع

#### Root Directory:
```
backend
```

#### Build Command (تلقائي):
```
npm install && npm run build
```

#### Start Command (تلقائي):
```
npm start
```

---

### 4️⃣ Environment Variables (مهم جداً!)

في Railway Dashboard → Variables، أضف:

```env
# Supabase Configuration
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTgwNTQsImV4cCI6MjA4Nzg3NDA1NH0.0lH6_OkPXvYb1PokkudAipBxaenwrmwPu5tk60sYqVU
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Server Configuration
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://your-vercel-app.vercel.app

# Shopify OAuth (Optional)
SHOPIFY_REDIRECT_URI=https://your-railway-app.railway.app/api/shopify/callback
```

**ملاحظة:** Railway هيديك `PORT` تلقائياً، بس حط 3002 كـ default.

---

### 5️⃣ الحصول على Service Role Key

1. **افتح Supabase Dashboard:**
   ```
   https://hgphobgcyjrtshwrnxfj.supabase.co
   ```

2. **Settings → API**

3. **انسخ `service_role` key** (مش anon!)

4. **حطه في Railway Variables:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

---

### 6️⃣ Deploy!

1. **Railway هيبدأ الـ build تلقائياً**
2. **انتظر حتى يكتمل** (2-3 دقائق)
3. **اضغط على الـ URL** اللي هيظهر

---

### 7️⃣ الحصول على Backend URL

بعد الـ deployment:

1. **Settings → Domains**
2. **Generate Domain**
3. **انسخ الـ URL:** `https://your-app.railway.app`

---

### 8️⃣ تحديث Frontend في Vercel

1. **Vercel Dashboard → tetiano → Settings → Environment Variables**

2. **عدل `VITE_API_URL`:**
   ```
   VITE_API_URL=https://your-app.railway.app
   ```

3. **Redeploy Frontend**

---

## ✅ اختبار Backend

### Test Health Endpoint:
```
https://your-app.railway.app/health
```

يجب أن يرجع:
```json
{
  "status": "ok",
  "timestamp": "2024-03-03T...",
  "uptime": 123.456,
  "environment": "production"
}
```

---

## 🔧 إعدادات إضافية

### تفعيل Auto-Deploy:

Railway بيعمل auto-deploy تلقائياً عند أي push على GitHub!

### مراقبة Logs:

في Railway Dashboard:
- **View Logs** (في الأعلى)
- شوف الـ logs في الوقت الفعلي

### Restart Service:

إذا حصلت مشكلة:
- **Settings → Restart**

---

## 🚨 مشاكل شائعة

### 1. Build fails
**الحل:** تأكد إن Root Directory = `backend`

### 2. "Cannot find module"
**الحل:** تأكد إن `npm install` اشتغل صح

### 3. Port already in use
**الحل:** Railway بيديك PORT تلقائياً، استخدمه:
```typescript
const PORT = process.env.PORT || 3002;
```

### 4. Database connection fails
**الحل:** تأكد من Environment Variables

---

## 📊 التكلفة

Railway بيدي:
- **$5 free credit شهرياً**
- **500 ساعة execution مجاناً**
- **100 GB bandwidth**

كافي للتطوير والاختبار!

---

## 🔗 الروابط المهمة

- **Railway Dashboard:** https://railway.app/dashboard
- **Documentation:** https://docs.railway.app/
- **GitHub Repo:** https://github.com/m0hammeda7mednasr-eng/tetiano

---

## ✅ Checklist

- [ ] حساب Railway جاهز
- [ ] Project تم إنشاؤه
- [ ] Root Directory = `backend`
- [ ] Environment Variables مضافة
- [ ] Service Role Key صحيح
- [ ] Build نجح
- [ ] Health endpoint يعمل
- [ ] Frontend URL محدث في Variables
- [ ] Frontend في Vercel محدث بـ Backend URL

---

## 🎉 النتيجة النهائية

بعد الانتهاء:

- **Frontend:** `https://tetiano.vercel.app`
- **Backend:** `https://tetiano-backend.railway.app`
- **Database:** Supabase (running)

**المشروع live على الإنترنت! 🚀**

---

## 📝 ملاحظات

1. **Auto-Deploy:** أي push على GitHub هيعمل deploy تلقائياً
2. **Logs:** متابعة الـ logs مهمة لاكتشاف المشاكل
3. **Environment:** تأكد إن `NODE_ENV=production`
4. **CORS:** تأكد إن Frontend URL مضاف في CORS settings

---

## 🔐 الأمان

- ✅ Environment Variables آمنة
- ✅ Service Role Key مش مكشوف
- ✅ HTTPS تلقائياً
- ✅ Rate limiting مفعل

**المشروع آمن وجاهز للإنتاج! 🔒**
