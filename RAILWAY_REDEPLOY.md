# 🚀 Force Railway Redeploy

## المشكلة

Railway لسه شغال الكود القديم (قبل الـ hotfix)، عشان كده الـ 403 errors لسه موجودة.

## الحل السريع ⚡

### Option 1: Empty Commit (الأسرع)

```bash
git commit --allow-empty -m "chore: trigger Railway redeploy"
git push origin main
```

### Option 2: Railway Dashboard

1. افتح https://railway.app
2. اذهب إلى project: tetiano-production
3. اضغط على Backend service
4. اضغط "Redeploy" من القائمة
5. انتظر 2-3 دقائق

### Option 3: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Redeploy
railway up
```

## التحقق من Deploy

### 1. Check Railway Logs

```bash
railway logs
```

يجب أن تشوف:

```
2026-03-07 [info]: API namespaces registered
2026-03-07 [info]: 🚀 Server running on port 3002
```

### 2. Test API

```bash
# Test health
curl https://tetiano-production.up.railway.app/health

# Test /me endpoint (should work now)
curl https://tetiano-production.up.railway.app/api/app/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Timeline

- ⏱️ Build: 1-2 minutes
- ⏱️ Deploy: 30 seconds
- ⏱️ Total: ~2-3 minutes

## بعد الـ Redeploy

1. ✅ الـ 403 errors هتختفي
2. ✅ `/api/app/me` هيشتغل بدون store
3. ✅ `/api/app/shopify/status` هيشتغل بدون store
4. ✅ `/api/app/notifications/unread-count` هيشتغل بدون store
5. ✅ New users يقدروا يستخدموا التطبيق

---

**Created:** 2026-03-07  
**Status:** 🔥 URGENT - Railway needs redeploy
