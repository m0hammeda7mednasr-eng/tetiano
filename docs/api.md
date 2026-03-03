# API Documentation

Base URL: `http://localhost:3002` (development) or your deployed backend URL

All authenticated endpoints require `Authorization: Bearer <token>` header.

## Authentication

Authentication is handled by Supabase. Get the access token from Supabase session.

## Endpoints

### Health Check

```
GET /health
```

Returns server status.

### Webhooks

#### Shopify Webhook Handler

```
POST /api/webhooks/shopify
```

Receives webhooks from Shopify. Requires valid HMAC signature.

Headers:
- `X-Shopify-Hmac-Sha256`: HMAC signature
- `X-Shopify-Topic`: Webhook topic
- `X-Shopify-Shop-Domain`: Shop domain

### Inventory

#### Get Inventory

```
GET /api/inventory
```

Query parameters:
- `brand_id` (optional): Filter by brand
- `search` (optional): Search by SKU, title, or barcode
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

#### Get Variant Details

```
GET /api/inventory/:variantId
```

Returns variant with inventory level and stock movements.

#### Adjust Stock

```
POST /api/inventory/:variantId/adjust
```

Requires: `operator` role or higher

Body:
```json
{
  "delta": -5,
  "reason": "Damaged items removed"
}
```

#### Get Stock Movements

```
GET /api/inventory/:variantId/movements
```

Query parameters:
- `limit` (optional): Number of movements (default: 50)

#### Sync Product

```
POST /api/inventory/sync/:brandId/:productId
```

Requires: `manager` role or higher

Syncs product from Shopify.

### Daily Reports

#### Get Reports

```
GET /api/reports
```

Query parameters:
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date
- `team_id` (optional): Filter by team

#### Submit Report

```
POST /api/reports
```

Body:
```json
{
  "done_today": "Completed inventory sync",
  "blockers": "API rate limit issues",
  "plan_tomorrow": "Optimize sync process",
  "report_date": "2024-01-15"
}
```

#### Check Today's Status

```
GET /api/reports/status/today
```

Returns whether user submitted today's report.

#### Get Team Summary

```
GET /api/reports/team/:teamId/summary
```

Query parameters:
- `date` (optional): Report date (default: today)

### Notifications

#### Get Notifications

```
GET /api/notifications
```

Query parameters:
- `unread_only` (optional): Filter unread only

#### Mark as Read

```
PATCH /api/notifications/:notificationId/read
```

#### Mark All as Read

```
POST /api/notifications/read-all
```

#### Get Unread Count

```
GET /api/notifications/unread-count
```

### Teams

#### Get My Teams

```
GET /api/teams/my-teams
```

Returns teams user belongs to.

#### Get Team Members

```
GET /api/teams/:teamId/members
```

#### Get Team Brands

```
GET /api/teams/:teamId/brands
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "status": 400
}
```

Common status codes:
- `400`: Bad request
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Internal server error

## Rate Limiting

Currently no rate limiting implemented. Consider adding in production.

## Webhooks

### Shopify Webhook Topics

The system listens to these topics:

- `inventory_levels/update`: Inventory level changed
- `orders/create`: New order created
- `orders/paid`: Order paid
- `orders/cancelled`: Order cancelled
- `refunds/create`: Refund created
- `products/update`: Product updated

### Webhook Security

- HMAC signature verification
- Idempotency using event hashes
- Async processing
