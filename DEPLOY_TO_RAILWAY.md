# Deploy Backend to Railway - Manual Steps

## Problem
Railway is running an old version of the backend that doesn't have the `/api/app` routes.

## Solution
Trigger a manual redeploy on Railway to pull the latest code from GitHub.

## Steps

### Option 1: Trigger Redeploy from Railway Dashboard (Recommended)

1. **Open Railway Dashboard**
   - Go to: https://railway.app/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Find and click on "tetiano" or your backend project
   - Click on the backend service

3. **Trigger Redeploy**
   - Click on the **Deployments** tab
   - Click the **Deploy** button (top right)
   - Or click on the latest deployment and select **Redeploy**

4. **Wait for Deployment**
   - Watch the build logs
   - Should take 2-3 minutes
   - Look for "Build successful" message

5. **Verify Deployment**
   - Check the deployment URL
   - Test: `https://tetiano-production.up.railway.app/health`
   - Should return: `{"status":"ok",...}`

### Option 2: Force Push to Trigger Auto-Deploy

If Railway has GitHub auto-deploy enabled:

```bash
# Create an empty commit to trigger deployment
git commit --allow-empty -m "chore: trigger Railway redeploy"
git push origin main
```

Railway will automatically detect the push and redeploy.

### Option 3: Install Railway CLI and Deploy

1. **Install Railway CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://railway.app/install.ps1 | iex
   
   # Or using npm
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Link to Project**
   ```bash
   cd backend
   railway link
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Verify Deployment Success

After deployment, test these endpoints:

### 1. Health Check
```bash
curl https://tetiano-production.up.railway.app/health
```
Expected: `{"status":"ok",...}`

### 2. App Routes
```bash
# Test /api/app/me (requires auth token)
curl https://tetiano-production.up.railway.app/api/app/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: `{"user":{...},"store":{...}}`

### 3. Check Logs
In Railway Dashboard:
- Go to your service
- Click **Logs** tab
- Look for: "🚀 Server running on port 3002"
- Look for: "⏰ Scheduled jobs started"

## What Should Be Deployed

The latest code includes:

### New Routes
- ✅ `/api/app/*` - All app endpoints (app.ts - 1357 lines)
- ✅ `/api/onboarding/*` - Bootstrap endpoint (onboarding.ts)

### Route Registration
In `backend/src/index.ts`:
```typescript
app.use("/api/app", appRoutes);
app.use("/api/onboarding", onboardingRoutes);
```

### Compiled Files
- ✅ `backend/dist/routes/app.js`
- ✅ `backend/dist/routes/onboarding.js`
- ✅ `backend/dist/index.js`

## Troubleshooting

### Deployment Fails

1. **Check Build Logs**
   - Look for TypeScript errors
   - Look for missing dependencies
   - Look for environment variable issues

2. **Verify Environment Variables**
   Required variables in Railway:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `FRONTEND_URL`
   - `PORT` (optional, defaults to 3002)

3. **Check package.json Scripts**
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```

### Routes Still 404

1. **Clear Railway Cache**
   - In Railway Dashboard
   - Settings → Clear Build Cache
   - Redeploy

2. **Check Logs for Route Registration**
   Look for these lines in logs:
   ```
   🚀 Server running on port 3002
   🌍 Environment: production
   ```

3. **Verify Git Commit**
   ```bash
   git log --oneline -5
   ```
   Should show recent commits:
   - `71e8cb6` - docs: Add Arabic quick start guide
   - `059a54f` - docs: Add comprehensive fix status report
   - `40543e2` - fix: Add production database schema migration

### Still Not Working?

1. **Check Railway Service Settings**
   - Verify it's connected to correct GitHub repo
   - Verify it's watching the `main` branch
   - Verify root directory is set to `backend` or `/`

2. **Manual Build Test**
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```
   If this works locally, Railway should work too.

3. **Check Railway Logs**
   Look for:
   - Build errors
   - Runtime errors
   - Port binding issues
   - Environment variable errors

## Expected Result

After successful deployment:

### Before
```
❌ GET /api/app/me → 404 Not Found
❌ POST /api/onboarding/bootstrap-store → 404 Not Found
❌ GET /api/app/shopify/status → 404 Not Found
```

### After
```
✅ GET /api/app/me → 200 OK (with auth)
✅ POST /api/onboarding/bootstrap-store → 201 Created (with auth)
✅ GET /api/app/shopify/status → 200 OK (with auth)
```

## Next Steps

After successful deployment:

1. ✅ Run `FIX_PRODUCTION_SCHEMA.sql` on Supabase
2. ✅ Test frontend at https://tetiano.vercel.app
3. ✅ Verify all features work
4. ✅ Monitor logs for errors

## Important Notes

- Railway auto-deploys on git push (if configured)
- Build takes 2-3 minutes
- Old deployments are kept for rollback
- Environment variables persist across deployments
- No downtime during deployment (zero-downtime deploy)

## Contact

If deployment fails:
1. Share Railway build logs
2. Share Railway runtime logs
3. Share error messages

---

**Last Updated:** March 6, 2026
**Commit:** 71e8cb6
**Status:** Ready to deploy
