# 🚀 دليل نشر المشروع على Vercel

## ❌ المشكلة الحالية:
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## ✅ الحل:

### الطريقة 1: تعديل إعدادات Vercel (الأسهل)

1. **افتح Vercel Dashboard:**
   - https://vercel.com/dashboard

2. **اذهب إلى Project Settings:**
   - اختار المشروع `tetiano`
   - Settings → General

3. **عدل Build & Development Settings:**
   ```
   Framework Preset: Other
   Root Directory: frontend
   Build Command: npm install && npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **احفظ وأعد Deploy:**
   - Deployments → Redeploy

---

### الطريقة 2: استخدام vercel.json (تلقائي)

الملف `vercel.json` موجود بالفعل في المشروع وبيحتوي على:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install --prefix frontend",
  "framework": null
}
```

**فقط اعمل commit و push:**

```bash
git add vercel.json
git commit -m "Add Vercel configuration"
git push origin main
```

Vercel هيعمل redeploy تلقائياً!

---

## 🔧 إعدادات Environment Variables

في Vercel Dashboard → Settings → Environment Variables، أضف:

### Frontend Variables:
```
VITE_SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=https://your-backend-url.com
```

---

## 📦 نشر Backend على Render/Railway

### Backend على Render:

1. **اذهب إلى Render:**
   - https://render.com/

2. **New Web Service:**
   - Connect GitHub repo: `tetiano`
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Environment Variables:**
   ```
   SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   PORT=3002
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

4. **Deploy!**

---

## 🔗 ربط Frontend بـ Backend

بعد نشر Backend، حدث الـ `VITE_API_URL` في Vercel:

```
VITE_API_URL=https://your-backend.onrender.com
```

ثم Redeploy Frontend.

---

## ✅ Checklist

- [ ] Frontend على Vercel
- [ ] Backend على Render/Railway
- [ ] Environment Variables محدثة
- [ ] Database Migrations مطبقة في Supabase
- [ ] Frontend يتصل بـ Backend بنجاح
- [ ] Authentication يعمل
- [ ] Admin Dashboard يعمل

---

## 🎯 الخطوات السريعة:

### 1️⃣ Push الـ vercel.json:
```bash
git add vercel.json VERCEL_DEPLOYMENT_GUIDE.md
git commit -m "Add Vercel configuration"
git push origin main
```

### 2️⃣ في Vercel Dashboard:
- Settings → General
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`

### 3️⃣ أضف Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

### 4️⃣ Redeploy:
- Deployments → Redeploy

---

## 🚨 مشاكل شائعة:

### 1. Build fails with "vite: command not found"
**الحل:** تأكد إن Root Directory = `frontend`

### 2. "Module not found" errors
**الحل:** تأكد إن `npm install` بيشتغل صح

### 3. Blank page after deployment
**الحل:** تأكد من Environment Variables

### 4. API calls fail
**الحل:** تأكد إن `VITE_API_URL` صحيح

---

## 📚 موارد إضافية:

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

## ✅ النتيجة النهائية:

بعد النشر، المشروع هيكون متاح على:

- **Frontend**: `https://tetiano.vercel.app`
- **Backend**: `https://tetiano-backend.onrender.com`
- **Database**: Supabase (already running)

**المشروع جاهز للإنتاج! 🎉**
