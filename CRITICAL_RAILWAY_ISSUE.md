# 🔥 CRITICAL: Railway Deployment Failed

## المشكلة الحالية

Railway **فشل في الـ build** والكود القديم لسه شغال. عشان كده:

1. ❌ CORS errors - Backend مش بيرد على preflight requests
2. ❌ 403 errors - الـ hotfix مش deployed
3. ❌ 503 errors - Database migration مش موجودة

## السبب

Railway build failed بسبب:

```
npm error The `npm ci` command can only install with an existing package-lock.json
```

## الحل الفوري ⚡

### Option 1: استخدام Railway Dashboard (الأسرع)

1. افتح https://railway.app
2. اذهب إلى project: **tetiano-production**
3. اضغط على **Backend service**
4. اضغط **Settings** → **Environment Variables**
5. تأكد من وجود:
   ```
   FRONTEND_URL=https://tetiano.vercel.app
   ```
6. اضغط **Deployments** → **View Logs** للـ latest deployment
7. لو Build failed، اضغط **Redeploy**

### Option 2: Force Rebuild من GitHub

```bash
# Empty commit to trigger rebuild
git commit --allow-empty -m "chore: force Railway rebuild"
git push origin main
```

### Option 3: تغيير Build Command في Railway

1. افتح Railway Dashboard
2. اذهب إلى Backend service → **Settings**
3. في **Build Command**، غيره من:
   ```
   npm ci
   ```
   إلى:
   ```
   npm install
   ```
4. اضغط **Save**
5. اضغط **Redeploy**

## التحقق من الـ Deployment

### 1. Check Build Logs

في Railway Dashboard → Deployments → Latest → View Logs

يجب أن تشوف:

```
✓ Build completed successfully
✓ Deployment successful
```

### 2. Check Runtime Logs

يجب أن تشوف:

```
2026-03-07 [info]: 🚀 Server running on port 3002
2026-03-07 [info]: 🌍 Environment: production
2026-03-07 [info]: 🏠 Frontend URL: https://tetiano.vercel.app
```

### 3. Test API

```bash
# Test health
curl https://tetiano-production.up.railway.app/health

# Should return: {"status":"ok"}
```

## Environment Variables المطلوبة في Railway

تأكد من وجود كل ده في Railway → Backend → Variables:

```bash
# Supabase
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3002
NODE_ENV=production

# Frontend (CRITICAL for CORS)
FRONTEND_URL=https://tetiano.vercel.app

# Backend
BACKEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
API_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Shopify
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
SHOPIFY_REDIRECT_URI=${{RAILWAY_PUBLIC_DOMAIN}}/api/shopify/callback

# Timezone
TZ=Africa/Cairo
```

## إذا لسه في CORS Errors

### Check CORS Configuration

في `backend/src/index.ts`، تأكد من:

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

### Verify FRONTEND_URL

```bash
# في Railway logs، يجب أن تشوف:
🏠 Frontend URL: https://tetiano.vercel.app
```

لو مش موجودة، معناها الـ environment variable مش set صح.

## إذا لسه في 403 Errors

معناها الكود القديم لسه شغال. يجب:

1. تأكد إن Railway deployed الـ latest commit (a7f0fca)
2. Check في Railway Dashboard → Deployments → Latest Commit
3. لو مش الـ latest commit، اعمل **Redeploy**

## Timeline المتوقع

- ⏱️ Fix environment variables: 2 minutes
- ⏱️ Redeploy: 2-3 minutes
- ⏱️ Service restart: 10 seconds
- 🎯 Total: ~5 minutes

## بعد الـ Fix

كل حاجة يجب أن تشتغل:

- ✅ No CORS errors
- ✅ No 403 errors
- ✅ `/api/app/me` works without store
- ✅ New users can use the app
- ✅ Shopify connection works

---

**Status:** 🔥 CRITICAL - Railway deployment failed  
**Action Required:** Fix build command or environment variables in Railway Dashboard  
**Priority:** URGENT - App is currently broken for all users
