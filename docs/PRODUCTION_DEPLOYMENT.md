# Production Deployment Runbook

## 1) Pre-release checks

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

Do not deploy if any command fails.

## 2) Supabase migration sequence

Apply in order:

1. `016_single_store_and_shopify_data.sql`
2. `017_store_per_tenant_v2.sql`
3. `019_final_production_fix.sql`
4. `020_strict_store_rls.sql`
5. `021_store_id_backfill_hardening.sql`

## 3) Railway backend release

- Root: `backend`
- Build: `npm run build`
- Start: `npm start`
- Required env:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
  - `FRONTEND_URL`
  - `BACKEND_URL`
  - `SHOPIFY_REDIRECT_URI`
  - `NODE_ENV=production`

## 4) Vercel frontend release

- Root: `frontend`
- Build command: `npm run build`
- Required env:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL` (Railway URL)

## 5) Post-deploy smoke test

1. `GET /health` returns `200`.
2. Login succeeds and dashboard loads.
3. `POST /api/app/shopify/connect` returns `201` and install URL.
4. OAuth callback returns to settings with connected status.
5. Full sync (`/api/app/shopify/sync/full`) runs for connected store.
6. Admin dashboard metrics and net profit cards load.

## 6) Incident quick checks

- Verify Railway env vars are present and not empty.
- Verify Supabase service role key is correct.
- Check backend logs for:
  - `route: /api/app/shopify/connect`
  - `route: /api/shopify/callback`
  - `route: /api/app/shopify/status`
- Confirm latest migrations exist in production DB.
