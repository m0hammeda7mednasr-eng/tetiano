# Multi‑Brand Inventory Management System

**Tetiano & 98** – a production‑ready web application for managing inventory across
multiple Shopify stores with fine‑grained team collaboration and auditing.

---

## 🔍 Overview

This repository contains a full‑stack solution:

- **Frontend** built with React, TypeScript, Vite and TailwindCSS.
- **Backend API** using Node.js/Express written in TypeScript and communicating
  with Supabase.
- **Database & Auth** handled by Supabase (PostgreSQL) with row‑level permissions,
  triggers, and an invite‑based RBAC system.
- **Deployments** target Vercel for static frontend and a container service
  (Render, Fly.io, etc.) for the backend.
- **Shopify integration** via Admin API and webhooks for realtime inventory sync.

Use this repo to bootstrap a secure, role‑based inventory platform that can be
expanded to support new brands or warehouses.

---

## 🚀 Getting Started

The **SETUP.md** document contains step‑by‑step instructions for installing,
configuring, and running the entire stack locally and in production. It covers:

1. cloning the repo and installing dependencies
2. creating the Supabase project with migrations and seed data
3. configuring Shopify apps and webhook endpoints
4. setting environment variables for frontend and backend
5. running dev servers simultaneously

For a quick reference, follow the *Quick Start* section below.

### Quick Start (Local Development)

```bash
# clone the repository
git clone git@github.com:your-org/tetiano.git
cd tetiano

# install both sides
cd backend && npm install
cd ../frontend && npm install

# configure Supabase (see SETUP.md for full details)
supabase db push

# create .env files in both frontend and backend
# copy values from .env.example and paste your own keys

# seed initial data
cd backend && npm run seed

# start development servers
# terminal 1
cd backend && npm run dev
# terminal 2
cd frontend && npm run dev
```

Open the browser:

- frontend – http://localhost:5173
- backend API – http://localhost:3002

The first registered account is promoted to **ADMIN** automatically. Any later
accounts must be created by an admin (or assigned by admin tools/SQL).

---

## 🗂 Project Structure

```
├── backend/          # Express API, routes, services, types, utilities
├── frontend/         # React components, pages, stores, UI logic
├── supabase/         # SQL migrations & row-level security policies
└── docs/             # detailed documentation (architecture, deployment, etc.)
```

---

## 🛠️ Development Notes

- **Role & permission system**: Users have a `role` (`OWNER`, `ADMIN`,
  `MANAGER`, `USER`, `VIEWER`) and optional permission keys. Admins can issue
  invites that create new user accounts with assigned roles/permissions.
- **Database triggers** ensure every authenticated user has a profile record.
- **RLS policies** in `supabase/migrations` restrict access on the server side.
- **Middleware** on the backend validates JWTs and enforces role/permission checks.
- **Frontend guards** protect routes and conditionally render UI based on role.

Refer to `backend/src/middleware` and `frontend/src/store/authStore.ts` for
implementation details.

---

## 📦 Deployment

1. **Frontend**: Deploy with Vercel or any static host. Build command is
   `npm run build` inside `frontend`.
2. **Backend**: Containerize using the provided `backend/Dockerfile` and
   deploy to Render, Fly.io, or similar. Ensure environment variables are set
   correctly and that the service can reach your Supabase instance.
3. **Supabase**: Use `supabase db push` or the SQL editor to run migrations when
   releasing a new version.

Detailed deployment procedures are available in `docs/deployment.md`.

---

## 🧾 Additional Resources

- `docs/architecture.md` – system diagrams and data flow
- `docs/features.md` – user‑facing functionality summary
- `docs/shopify-oauth-setup.md` – configuring Shopify custom apps

---

## 📄 License

MIT
