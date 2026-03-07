# 📚 API Documentation

## Base URL

```
Production: https://tetiano-production.up.railway.app
Development: http://localhost:3002
```

## Authentication

All API requests (except health check and webhooks) require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

Get the token from Supabase auth:

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-07T12:00:00.000Z",
  "uptime": 1234.56,
  "environment": "production"
}
```

---

### Authentication

#### POST /api/auth/signup

Create a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### POST /api/auth/login

Sign in to an existing account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

---

### User Profile

#### GET /api/app/me

Get current user profile and store information.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "store_role": "admin",
    "permissions": {
      "can_view_inventory": true,
      "can_edit_inventory": true,
      "can_view_orders": true
    }
  },
  "store": {
    "id": "uuid",
    "name": "My Store",
    "slug": "my-store",
    "status": "active"
  },
  "profile": {
    "id": "uuid",
    "full_name": "John Doe",
    "avatar_color": "#6366f1",
    "is_active": true
  }
}
```

---

### Dashboard

#### GET /api/app/dashboard/overview

Get dashboard overview statistics.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "overview": {
    "products_total": 150,
    "orders_total": 45,
    "customers_total": 30,
    "reports_total": 12,
    "members_total": 5,
    "members_active_total": 4,
    "members_inactive_total": 1,
    "low_stock_total": 8,
    "latest_net_profit": 1250.5,
    "total_net_profit": 45000.0,
    "latest_net_profit_order_name": "#1234",
    "latest_net_profit_order_number": 1234,
    "latest_net_profit_currency": "USD",
    "latest_net_profit_at": "2026-03-07T10:00:00Z"
  }
}
```

---

### Products

#### GET /api/app/products

List all products with pagination and search.

**Headers:**

```http
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (number, default: 1): Page number
- `limit` (number, default: 50, max: 200): Items per page
- `search` (string, optional): Search by SKU, title, or barcode

**Response:**

```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Product Name",
      "sku": "SKU-123",
      "barcode": "1234567890",
      "price": 29.99,
      "compare_at_price": 39.99,
      "inventory_quantity": 100,
      "product": {
        "id": "uuid",
        "title": "Product Name",
        "vendor": "Brand Name",
        "product_type": "Category",
        "status": "active"
      },
      "inventory_levels": {
        "available": 100
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

#### PATCH /api/app/products/:id

Update product details.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "title": "Updated Product Name",
  "vendor": "New Brand",
  "product_type": "New Category",
  "status": "active"
}
```

**Response:**

```json
{
  "success": true,
  "product": {
    "id": "uuid",
    "title": "Updated Product Name",
    "vendor": "New Brand",
    "updated_at": "2026-03-07T12:00:00Z"
  }
}
```

#### PATCH /api/app/variants/:id

Update variant details (SKU, barcode, price).

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "sku": "NEW-SKU-123",
  "barcode": "9876543210",
  "price": 34.99,
  "compare_at_price": 44.99
}
```

**Response:**

```json
{
  "success": true,
  "variant": {
    "id": "uuid",
    "sku": "NEW-SKU-123",
    "price": 34.99,
    "updated_at": "2026-03-07T12:00:00Z"
  }
}
```

---

### Inventory

#### POST /api/app/variants/:id/adjust-stock

Adjust inventory quantity for a variant.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "delta": -5,
  "reason": "Sold 5 units",
  "source": "manual"
}
```

**Response:**

```json
{
  "success": true,
  "previous_quantity": 100,
  "new_quantity": 95,
  "movement": {
    "id": "uuid",
    "delta": -5,
    "reason": "Sold 5 units",
    "created_at": "2026-03-07T12:00:00Z"
  }
}
```

#### GET /api/app/variants/:id/movements

Get stock movement history for a variant.

**Headers:**

```http
Authorization: Bearer <token>
```

**Query Parameters:**

- `limit` (number, default: 100, max: 500): Number of movements to return

**Response:**

```json
{
  "movements": [
    {
      "id": "uuid",
      "delta": -5,
      "previous_quantity": 100,
      "new_quantity": 95,
      "source": "manual",
      "reason": "Sold 5 units",
      "reference_id": null,
      "created_at": "2026-03-07T12:00:00Z",
      "created_by": "uuid"
    }
  ]
}
```

---

### Orders

#### GET /api/app/orders

List all orders with pagination.

**Headers:**

```http
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (number, default: 1): Page number
- `limit` (number, default: 50, max: 200): Items per page

**Response:**

```json
{
  "orders": [
    {
      "id": "uuid",
      "shopify_order_id": "1234567890",
      "order_name": "#1234",
      "order_number": 1234,
      "email": "customer@example.com",
      "financial_status": "paid",
      "fulfillment_status": "fulfilled",
      "currency": "USD",
      "total_price": 129.99,
      "created_at_shopify": "2026-03-07T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45
  }
}
```

#### GET /api/app/orders/:id

Get order details.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "order": {
    "id": "uuid",
    "shopify_order_id": "1234567890",
    "order_name": "#1234",
    "order_number": 1234,
    "email": "customer@example.com",
    "financial_status": "paid",
    "fulfillment_status": "fulfilled",
    "currency": "USD",
    "subtotal_price": 119.99,
    "total_tax": 10.00,
    "total_price": 129.99,
    "line_items": [...],
    "created_at_shopify": "2026-03-07T10:00:00Z"
  }
}
```

---

### Reports

#### GET /api/app/reports

List all daily reports.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "reports": [
    {
      "id": "uuid",
      "report_date": "2026-03-07",
      "body_text": "Done today: ...\nBlockers: ...\nPlan: ...",
      "status": "submitted",
      "author_user_id": "uuid",
      "created_at": "2026-03-07T18:00:00Z"
    }
  ]
}
```

#### GET /api/app/reports/status/today

Check if today's report has been submitted.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "submitted": true,
  "report": {
    "id": "uuid",
    "report_date": "2026-03-07",
    "body_text": "...",
    "created_at": "2026-03-07T18:00:00Z"
  }
}
```

#### POST /api/app/reports

Submit a daily report.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "done_today": "Completed inventory sync",
  "blockers": "None",
  "plan_tomorrow": "Review orders",
  "report_date": "2026-03-07"
}
```

**Response:**

```json
{
  "report": {
    "id": "uuid",
    "report_date": "2026-03-07",
    "body_text": "Done: Completed inventory sync\n\nBlockers: None\n\nPlan: Review orders",
    "status": "submitted",
    "created_at": "2026-03-07T18:00:00Z"
  }
}
```

---

### Shopify Integration

#### GET /api/app/shopify/status

Get Shopify connection status.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "connected": true,
  "status": "connected",
  "shop_domain": "my-store.myshopify.com",
  "scopes": "read_products,write_products,read_inventory",
  "connected_at": "2026-03-01T10:00:00Z",
  "updated_at": "2026-03-07T12:00:00Z"
}
```

#### POST /api/app/shopify/connect

Start Shopify OAuth flow.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "shop": "my-store.myshopify.com",
  "api_key": "your_api_key",
  "api_secret": "your_api_secret"
}
```

**Response:**

```json
{
  "install_url": "https://my-store.myshopify.com/admin/oauth/authorize?...",
  "state": "random_state_token",
  "shop": "my-store.myshopify.com"
}
```

#### POST /api/app/shopify/disconnect

Disconnect from Shopify.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true
}
```

#### POST /api/app/shopify/sync/full

Trigger full sync from Shopify.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Full sync started"
}
```

---

### User Management (Admin Only)

#### GET /api/app/users

List all users in the store.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "users": [
    {
      "membership_id": "uuid",
      "user_id": "uuid",
      "store_role": "admin",
      "membership_status": "active",
      "full_name": "John Doe",
      "is_active": true
    }
  ]
}
```

#### POST /api/app/users

Create a new user.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "full_name": "Jane Doe",
  "store_role": "staff"
}
```

**Response:**

```json
{
  "success": true,
  "user_id": "uuid",
  "membership": {
    "id": "uuid",
    "store_role": "staff",
    "status": "active"
  }
}
```

#### PATCH /api/app/users/:id/role

Update user role.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "store_role": "manager"
}
```

**Response:**

```json
{
  "success": true,
  "membership": {
    "id": "uuid",
    "store_role": "manager",
    "updated_at": "2026-03-07T12:00:00Z"
  }
}
```

#### PATCH /api/app/users/:id/status

Activate or deactivate user.

**Headers:**

```http
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "status": "inactive"
}
```

**Response:**

```json
{
  "success": true,
  "membership": {
    "id": "uuid",
    "status": "inactive",
    "updated_at": "2026-03-07T12:00:00Z"
  }
}
```

---

### Webhooks (Shopify)

#### POST /api/webhooks/shopify

Receive webhooks from Shopify.

**Headers:**

```http
X-Shopify-Topic: orders/create
X-Shopify-Shop-Domain: my-store.myshopify.com
X-Shopify-Hmac-SHA256: base64_hmac
X-Shopify-Webhook-Id: unique_id
```

**Request Body:**

```json
{
  "id": 1234567890,
  "order_number": 1234,
  "email": "customer@example.com",
  ...
}
```

**Response:**

```json
{
  "received": true
}
```

**Supported Topics:**

- `orders/create`
- `orders/updated`
- `orders/cancelled`
- `products/create`
- `products/update`
- `products/delete`
- `customers/create`
- `customers/update`
- `customers/delete`
- `inventory_levels/update`

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "error_code",
  "details": "Additional details (optional)"
}
```

### Common Error Codes

| Code                     | Status | Description                             |
| ------------------------ | ------ | --------------------------------------- |
| `unauthorized`           | 401    | Missing or invalid authentication token |
| `forbidden`              | 403    | Insufficient permissions                |
| `not_found`              | 404    | Resource not found                      |
| `validation_failed`      | 400    | Invalid request data                    |
| `store_id_required`      | 400    | User has no store context               |
| `duplicate_shop_domain`  | 409    | Shopify store already connected         |
| `schema_incompatible`    | 500    | Database schema mismatch                |
| `shopify_connect_failed` | 500    | Failed to connect to Shopify            |

---

## Rate Limiting

- **General API**: 100 requests per minute per user
- **Webhooks**: 1000 requests per minute per store
- **Auth endpoints**: 10 requests per minute per IP

Rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678195200
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**

- `page` (number, default: 1): Page number
- `limit` (number, default: 50): Items per page

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

---

## Permissions

### Store Roles

| Role      | Description                                     |
| --------- | ----------------------------------------------- |
| `admin`   | Full access to all features                     |
| `manager` | Can manage products, inventory, orders, reports |
| `staff`   | Can view inventory, submit reports              |
| `viewer`  | Read-only access                                |

### Permission Keys

| Permission           | Description                    |
| -------------------- | ------------------------------ |
| `can_view_inventory` | View products and inventory    |
| `can_edit_inventory` | Edit products and adjust stock |
| `can_view_orders`    | View orders and customers      |
| `can_submit_reports` | Submit daily reports           |
| `can_view_reports`   | View all reports               |
| `can_manage_users`   | Manage team members            |
| `can_view_finance`   | View cost and profit data      |
| `shopify.manage`     | Manage Shopify connection      |

---

## Webhooks Setup

To receive Shopify webhooks:

1. **Register webhooks** after connecting Shopify:

   ```bash
   POST /api/shopify/setup-webhooks/:brandId
   ```

2. **Webhook URL** in Shopify App settings:

   ```
   https://your-backend.railway.app/api/webhooks/shopify
   ```

3. **Webhook secret** (optional):
   Set `SHOPIFY_WEBHOOK_SECRET` in Railway environment variables

---

## Testing

### Using curl

```bash
# Get health status
curl https://your-backend.railway.app/health

# Get user profile
curl https://your-backend.railway.app/api/app/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# List products
curl https://your-backend.railway.app/api/app/products?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman

1. Import the API collection (coming soon)
2. Set environment variables:
   - `base_url`: Your backend URL
   - `jwt_token`: Your JWT token
3. Run requests

---

## Support

For issues or questions:

- Check [troubleshooting.md](troubleshooting.md)
- Review [SETUP_GUIDE.md](../SETUP_GUIDE.md)
- Open an issue on GitHub
