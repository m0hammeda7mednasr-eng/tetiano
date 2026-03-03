# Setup Guide

A professional, end-to-end guide to get the full stack running with all
services (frontend, backend, database) operating at 100 %.

---

## ✅ Prerequisites

- Node.js 18+ (npm or yarn)
- Supabase account (free tier is sufficient)
- Shopify Partner account with access to the relevant stores
- Git CLI
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional but
  recommended)

---

## 1. Clone & Install Dependencies

```bash
git clone git@github.com:your-org/tetiano.git
cd tetiano

# backend
cd backend && npm install

# frontend
cd ../frontend && npm install
```

---

## 2. Supabase Configuration

1. Create a new project on Supabase and note the **URL** and **anon/service
   keys**.
2. Copy the contents of each SQL file in `supabase/migrations` and execute
   them via the SQL editor, or run `supabase db push` from the `supabase`
   directory if you have the CLI configured.
3. The migration set includes:
   - user profile table and RLS policies
   - roles & permissions schema
   - Shopify webhook log tables
   - invite system triggers/Policies

> ⚠️ After running migrations, you may run `supabase db seed` if you have a
> seed script defined; otherwise see step 6 below.

---

## 3. Shopify App Setup

For each brand/store create a **custom app** with the following scopes:

- `read_products`, `write_products`
- `read_inventory`, `write_inventory`
- `read_orders`

Obtain an **Admin API access token**, and record the `location_id` by
calling:
```
GET /admin/api/2024-01/locations.json
```

These values populate the backend `.env` variables (see next section).

---

## 4. Webhook Registration

Point Shopify webhooks to your backend endpoint:

```
POST https://your-backend.com/api/webhooks/shopify
```

Subscribe to the following topics:

- `inventory_levels/update`
- `orders/create`, `orders/paid`, `orders/cancelled`
- `refunds/create`
- `products/update`

The backend validates HMAC and enforces idempotency automatically.

---

## 5. Environment Variables

### Backend

```bash
cd backend
cp .env.example .env
# then edit .env with your Supabase keys, Shopify tokens, etc.
```

### Frontend

```bash
cd frontend
cp .env.example .env
# fill in VITE_SUPABASE_URL and ANON_KEY; set VITE_API_URL to the backend
```

Make sure the `SUPABASE_SERVICE_KEY` (server‑side secret) is **never
exposed** to the frontend.

---

## 6. Seed Data (Optional)

Run the seeding script to create sample brands, roles, and an initial admin
record:

```bash
cd backend
npm run seed
```

This is helpful for development; production projects may skip or customize
the seed step.

---

## 7. Start Development Servers

```bash
# terminal 1 – backend
cd backend && npm run dev

# terminal 2 – frontend
cd frontend && npm run dev
```

- frontend: http://localhost:5173
- backend API: http://localhost:3001

Sign up for a user account; **every** registration will be stored with the
`admin` role thanks to the `handle_new_user` trigger. You can change this
behavior later or override it by editing the user_profiles table in the
Supabase dashboard.

---

## 8. User Roles & Invites

- Administrators can issue invitations utilizing the `/api/admin/invites`
  endpoint; each invite encodes a role and optional permissions.
- Invitations are tracked in the `Invite` table and expire after 7 days.
- Accepting an invite creates a new user with the specified role; viewer and
  manager accounts are common for non‑admin staff.

Administrative role changes can also be made directly with SQL or via the
backend API.

---

## 9. Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

### Backend (Render / Fly.io / Docker)

Build using the included `backend/Dockerfile`, set the required environment
variables, and point the service at your Supabase instance.  Refer to
`docs/deployment.md` for sample configs.

### Database

When deploying a new release, run the latest migrations with:

```bash
supabase db push   # or copy SQL into the editor
```

---

## 🔧 Troubleshooting

- **Webhook failures**: inspect Shopify logs and ensure `SHOPIFY_WEBHOOK_SECRET`
  matches backend value.
- **Authentication errors**: confirm Supabase keys and that the JWT secret is
  valid.
- **Row‑level security (RLS)** denials: verify the user has an entry in
  `team_members` or `user_profiles` with an appropriate role.

---

Congratulations – your frontend, backend and database should now be running
smoothly in development and ready for production deployment. Keep this guide
handy for onboarding new developers or setting up additional environments.
