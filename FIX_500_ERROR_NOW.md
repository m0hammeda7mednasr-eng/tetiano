# 🔧 Fix 500 Error - Quick Guide

## Current Status

✅ **Railway deployed successfully** - Routes are working (no more 404)  
❌ **Database missing tables** - Getting 500 errors on Shopify connect

---

## The Problem

```
POST /api/app/shopify/connect → 500 Internal Server Error
```

**Root Cause**: Missing `shopify_oauth_states` table and other required tables in Supabase.

---

## The Solution (2 Steps)

### Step 1: Run SQL Script on Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Copy the entire content of `COMPLETE_DATABASE_FIX.sql`
4. Paste and click **Run**

### Step 2: Test

After running the script, test:
```
https://tetiano.vercel.app
```

Try connecting to Shopify - should work now!

---

## What the Script Does

Creates these tables if they don't exist:

- `shopify_oauth_states` - OAuth flow state management
- `shopify_sync_runs` - Sync operation tracking
- `report_attachments` - Daily report attachments
- `report_comments` - Report comments
- `reports` - Daily reports
- `shopify_customers` - Customer data from Shopify

All with proper indexes, RLS policies, and permissions.

---

## Verification

Run this query in Supabase SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'shopify_oauth_states',
    'shopify_sync_runs',
    'report_attachments',
    'report_comments',
    'reports',
    'shopify_customers'
  )
ORDER BY table_name;
```

You should see all 6 tables listed.

---

## Next Steps

After fixing the database:

1. ✅ Test login at `https://tetiano.vercel.app`
2. ✅ Test Shopify connection
3. ✅ Test adding products
4. ✅ Test inventory management
5. ✅ Test daily reports

---

## Need Help?

If you still get errors, share:
- Browser console errors (F12)
- Railway logs
- Supabase logs

**Quick test**: This should return 401 (not 404 or 500):
```
https://tetiano-production.up.railway.app/api/app/me
```

---

**Action Required**: Run `COMPLETE_DATABASE_FIX.sql` on Supabase now! 🚀
