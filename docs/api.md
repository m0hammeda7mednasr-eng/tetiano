# API Reference

Base URL:

- Local: `http://localhost:3002`
- Production: Railway backend URL

Auth:

- Protected endpoints require `Authorization: Bearer <supabase_access_token>`.

## Health

- `GET /health`

## Primary App API (`/api/app/*`)

Store-scoped business API.

- `GET /api/app/me`
- `GET /api/app/dashboard/overview`

Inventory and catalog:

- `GET /api/app/products`
- `PATCH /api/app/products/:id`
- `PATCH /api/app/variants/:id`
- `PATCH /api/app/variants/:id/stock`
- `GET /api/app/variants/:id/movements`

Commerce:

- `GET /api/app/orders`
- `GET /api/app/orders/:id`
- `GET /api/app/customers`

Reports:

- `GET /api/app/reports`
- `GET /api/app/reports/status/today`
- `POST /api/app/reports`
- `POST /api/app/reports/:id/attachments/presign`
- `POST /api/app/reports/:id/comments`

Admin users:

- `GET /api/app/users`
- `POST /api/app/users`
- `PATCH /api/app/users/:id/role`
- `PATCH /api/app/users/:id/status`

Shopify in settings:

- `GET /api/app/shopify/status`
- `POST /api/app/shopify/connect`
- `POST /api/app/shopify/disconnect`
- `POST /api/app/shopify/sync/full`

Notifications:

- `GET /api/app/notifications`
- `GET /api/app/notifications/unread-count`
- `PATCH /api/app/notifications/:id/read`

## Shopify OAuth / Compatibility API (`/api/shopify/*`)

- `GET /api/shopify/auth`
- `POST /api/shopify/get-install-url`
- `POST /api/shopify/callback`
- `GET /api/shopify/callback`
- `GET /api/shopify/brands`
- `POST /api/shopify/setup-webhooks/:brandId`
- `POST /api/shopify/disconnect/:brandId`
- `GET /api/shopify/status/:brandId`

## Webhooks (`/api/webhooks/*`)

- `POST /api/webhooks/shopify`

Required Shopify headers:

- `X-Shopify-Hmac-Sha256`
- `X-Shopify-Topic`
- `X-Shopify-Shop-Domain`

## Onboarding (`/api/onboarding/*`)

- `POST /api/onboarding/bootstrap-store`

## Notes

- Canonical tenant scope is `store_id`.
- Legacy `brand_id` is still accepted internally for transition compatibility.
- Legacy `/api/inventory` style endpoints are not canonical in current backend.
