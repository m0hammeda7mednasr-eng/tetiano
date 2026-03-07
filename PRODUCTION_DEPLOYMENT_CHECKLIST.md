# 🚀 Tetiano Production Deployment Guide

## ✅ Current Status

- ✅ Backend: Built and ready
- ✅ Frontend: Built and ready
- ✅ Environment: Configured
- ⏳ Database: Needs migration
- ⏳ Testing: In progress

---

## Step 1: Database Setup (CRITICAL - Must Do First)

### Option A: Using Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard
2. Select project: `tetiano` (ID: `hgphobgcyjrtshwrnxfj`)
3. Click "SQL Editor" in the left sidebar
4. Click "+ New Query"
5. Copy entire content from `supabase/migrations/002_safe_migration.sql`
6. Paste into the SQL editor
7. Click "Run" button
8. Wait for "Success" message

**Expected Result**: All 22 database tables created

### Option B: Using Supabase CLI

```bash
cd supabase
supabase migration up
```

---

## Step 2: Backend Deployment (Railway)

### Current Status

- ✅ Code is merged to `main` branch
- ✅ Build configuration fixed
- ⏳ Railway will auto-deploy

### Verify Deployment

1. Go to: https://railway.app/dashboard
2. Select "tetiano-production" project
3. Click "Backend" service
4. Check latest deployment status

**What to look for**:

```
✅ Build completed successfully
✅ Deployment successful
2026-03-07 [info]: 🚀 Server running on port 3002
2026-03-07 [info]: 🌍 Environment: production
2026-03-07 [info]: 🏠 Frontend URL: https://tetiano.vercel.app
```

### Environment Variables on Railway

All set under "Backend" service → Variables:

- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_KEY
- ✅ FRONTEND_URL
- ✅ NODE_ENV=production

---

## Step 3: Frontend Deployment (Vercel)

### Current Status

- ✅ Build succeeds locally
- ✅ Vercel is connected to GitHub

### Verify Deployment

1. Go to: https://vercel.com/dashboard
2. Find "tetiano" project
3. Latest deployment should be auto-deployed from `main` branch

**Expected URL**: https://tetiano.vercel.app

---

## Step 4: Testing

### 4.1 Local Testing (Before Production)

```bash
# Terminal 1: Start Backend
cd backend
npm run dev
# Expected: Server running on http://localhost:3002

# Terminal 2: Start Frontend
cd frontend
npm run dev
# Expected: Frontend running on http://localhost:5173
```

### 4.2 Manual Testing Checklist

- [ ] Sign up new user
- [ ] Login with user
- [ ] Dashboard loads
- [ ] No 403 errors
- [ ] No 503 errors
- [ ] Create/update inventory
- [ ] Shopify connection flows

### 4.3 Production Testing

1. Open: https://tetiano.vercel.app
2. Try to sign up
3. Try to login
4. All features should work

---

## Step 5: Monitoring & Troubleshooting

### Check Backend Health

```bash
curl https://tetiano-production.up.railway.app/api/app/me
# Should return user info or 401 if not authenticated
```

### Common Issues & Solutions

| Issue                   | Solution                           |
| ----------------------- | ---------------------------------- |
| 503 Service Unavailable | Run database migration (Step 1)    |
| 403 Forbidden           | Check user authentication          |
| 400 Bad Request         | Check request payload              |
| CORS errors             | Frontend URL not in CORS whitelist |

### View Logs

**Backend (Railway)**:

- https://railway.app → tetiano-production → Backend → Deployments → Logs

**Frontend (Vercel)**:

- https://vercel.com → tetiano → Deployments → Logs

---

## Step 6: Post-Deployment Tasks

- [ ] Test all critical features
- [ ] Monitor error logs for 24 hours
- [ ] Set up monitoring/alerts
- [ ] Document any issues found
- [ ] Plan next features/improvements

---

## Emergency Rollback

### If Something Breaks

1. **Frontend**: Push to `main` branch → Vercel auto-deploys in 30 seconds
2. **Backend**:
   - Railway will auto-deploy latest commit
   - Or manually restart from previous deployment

---

## Production URLs

- **Frontend**: https://tetiano.vercel.app
- **Backend API**: https://tetiano-production.up.railway.app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/hgphobgcyjrtshwrnxfj

---

## Questions?

See troubleshooting guide: [docs/troubleshooting.md](../docs/troubleshooting.md)
