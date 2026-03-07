# Tetiano

Store-scoped inventory + Shopify integration platform.

## Stack

- Frontend: React + TypeScript + Vite + Zustand + Supabase JS
- Backend: Node.js + Express + TypeScript + Supabase JS
- Database/Auth: Supabase Postgres + Supabase Auth
- Deployment: Vercel (frontend) + Railway (backend)

## Monorepo Layout

```
backend/    Express API
frontend/   React app
supabase/   SQL migrations
docs/       Canonical documentation
```

## Getting Started

### 1) Install

```bash
npm ci
```

### 2) Configure env

- `backend/.env` from `backend/.env.example`
- `frontend/.env` from `frontend/.env.example`

Required highlights:

- Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_URL`, `BACKEND_URL`
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

### 3) Run migrations

Apply migrations in order, including hardening chain:

- `016_single_store_and_shopify_data.sql`
- `017_store_per_tenant_v2.sql`
- `019_final_production_fix.sql`
- `020_strict_store_rls.sql`
- `021_store_id_backfill_hardening.sql`

### 4) Run locally

```bash
# backend
npm run dev:backend

# frontend (another terminal)
npm run dev:frontend
```

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run build
```

## API Namespaces

- `/health`
- `/api/app/*` (primary app API)
- `/api/shopify/*` (OAuth + Shopify compatibility routes)
- `/api/webhooks/*` (Shopify webhooks)
- `/api/onboarding/*`

See full API docs in [`docs/api.md`](docs/api.md).

## Deployment

- Frontend: deploy `frontend/` on Vercel
- Backend: deploy `backend/` on Railway

Deployment details: [`docs/deployment.md`](docs/deployment.md) and [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md).
