# Deployment (Railway + Vercel)

## Architecture

- Backend: Railway (`backend/`)
- Frontend: Vercel (`frontend/`)
- Database/Auth: Supabase

## Backend on Railway

1. Create Railway service from this repo.
2. Set root directory to `backend`.
3. Build command: `npm run build`
4. Start command: `npm start`
5. Set env vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - `FRONTEND_URL` (Vercel domain)
   - `BACKEND_URL` (Railway public URL)
   - `SHOPIFY_REDIRECT_URI` (`https://<railway-domain>/api/shopify/callback`)
   - `NODE_ENV=production`
   - `TZ=Africa/Cairo`

## Frontend on Vercel

1. Create Vercel project from this repo.
2. Set root directory to `frontend`.
3. Framework preset: `Vite`.
4. Set env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (Railway backend URL)

## Database rollout

Run latest migration chain in Supabase SQL editor:

- `016_single_store_and_shopify_data.sql`
- `017_store_per_tenant_v2.sql`
- `019_final_production_fix.sql`
- `020_strict_store_rls.sql`
- `021_store_id_backfill_hardening.sql`

## Verification

Run from repo root before release:

```bash
npm run lint
npm run typecheck
npm run build
```

Runtime checks:

- `GET /health` returns `200`.
- Shopify connect starts (`POST /api/app/shopify/connect` returns `201`).
- OAuth callback updates status correctly in settings.
