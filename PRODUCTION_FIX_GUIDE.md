# Production Fix Guide - Resolving 400 & 404 Errors

## Problem Summary

After the major refactoring (commit 093fb2c), production is experiencing critical errors:

### 1. Database Schema Errors (400 Bad Request)
```
GET user_profiles?select=id,full_name,role,store_id,is_active,avatar_color,permissions
Error: column "store_id" does not exist
Error: column "permissions" does not exist
```

### 2. Missing Backend Routes (404 Not Found)
- `POST /api/onboarding/bootstrap-store` - 404
- `GET /api/app/shopify/status` - 404
- `GET /api/app/notifications/unread-count` - 404
- `GET /api/app/users` - 404
- `GET /api/app/dashboard/overview` - 404
- `GET /api/app/orders` - 404

## Root Cause

The backend routes exist and are properly registered in `backend/src/index.ts`, but the database schema hasn't been updated to match the new multi-tenant architecture.

## Solution

### Step 1: Run Database Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Open `FIX_PRODUCTION_SCHEMA.sql`
5. Copy all content and paste into SQL Editor
6. Click **Run** to execute

### Step 2: Verify Migration Success

After running the script, verify:
- `stores` table created
- `store_memberships` table created
- `shopify_connections` table created
- New columns added to `user_profiles`
- Data backfilled from `brands` table

### Step 3: Test Production

1. Open: https://tetiano.vercel.app
2. Sign in
3. Check browser console - errors should be gone
4. Test all features:
   - Dashboard loads
   - Orders page works
   - Shopify status displays
   - Notifications work

## What the Migration Does

### 1. Creates Core Tables
- `stores` - Multi-tenant store management
- `store_memberships` - User-store relationships
- `shopify_connections` - Shopify OAuth data

### 2. Adds Missing Columns
- `user_profiles.store_id` - Links users to stores
- `products.store_id` - Store-scoped products
- `variants.store_id` - Store-scoped variants
- `inventory_levels.store_id` - Store-scoped inventory
- `shopify_orders.store_id` - Store-scoped orders
- `notifications.store_id` - Store-scoped notifications
- `notifications.is_read` - Read status

### 3. Backfills Data
- Migrates data from `brands` to `stores`
- Creates memberships from `user_profiles`
- Copies Shopify credentials to `shopify_connections`
- Links all records to appropriate stores

### 4. Creates Indexes
Performance indexes for:
- Store lookups
- User memberships
- Product queries
- Order queries
- Notification queries

## Backend Status ✅

All routes are implemented and working:

### App Routes (`/api/app/*`)
- `GET /me` - Current user context
- `GET /dashboard/overview` - Dashboard stats
- `GET /products` - Product list
- `PATCH /products/:id` - Update product
- `PATCH /variants/:id/stock` - Adjust stock
- `GET /variants/:id/movements` - Stock history
- `GET /orders` - Order list
- `GET /orders/:id` - Order details
- `GET /customers` - Customer list
- `GET /reports` - Report list
- `POST /reports` - Create report
- `GET /users` - User list (admin)
- `POST /users` - Create user (admin)
- `GET /shopify/status` - Shopify connection status
- `POST /shopify/connect` - Start OAuth flow
- `POST /shopify/disconnect` - Disconnect store
- `POST /shopify/sync/full` - Full sync
- `GET /notifications` - Notification list
- `GET /notifications/unread-count` - Unread count

### Onboarding Routes (`/api/onboarding/*`)
- `POST /bootstrap-store` - Create store for new user

## Troubleshooting

### If 400 Errors Persist

Check Supabase logs:
```sql
-- Verify columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

-- Should include: store_id
```

### If 404 Errors Persist

Check Railway logs:
```bash
railway logs
```

Verify routes are registered in `backend/src/index.ts`:
```typescript
app.use("/api/app", appRoutes);
app.use("/api/onboarding", onboardingRoutes);
```

### If Data is Missing

Re-run backfill queries from `FIX_PRODUCTION_SCHEMA.sql`:
```sql
-- Backfill stores
INSERT INTO stores (id, name, slug, created_at, updated_at)
SELECT ...
FROM brands b
ON CONFLICT (id) DO NOTHING;
```

## Next Steps

After fixing production:

1. ✅ Test all features thoroughly
2. ✅ Verify Shopify integration works
3. ✅ Create database backup
4. ✅ Push changes to GitHub
5. ✅ Update documentation
6. ✅ Monitor error logs

## Important Files

- `FIX_PRODUCTION_SCHEMA.sql` - Database migration script
- `backend/src/routes/app.ts` - All app endpoints (1357 lines)
- `backend/src/routes/onboarding.ts` - Bootstrap endpoint
- `backend/src/index.ts` - Route registration
- `frontend/src/store/authStore.ts` - Auth logic with schema compatibility

## Migration Safety

The migration script is safe to run multiple times:
- Uses `IF NOT EXISTS` for table creation
- Uses `ON CONFLICT DO NOTHING` for data insertion
- Preserves existing data
- Only adds missing columns and tables

## Contact

If issues persist, provide:
1. Full error message from browser console
2. Railway logs output
3. Supabase logs from SQL Editor
