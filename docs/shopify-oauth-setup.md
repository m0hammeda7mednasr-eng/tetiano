# Shopify OAuth Setup Guide

## Overview

The system now supports Shopify OAuth for secure, per-brand authentication instead of hard-coded access tokens.

## Benefits

- ✅ Secure OAuth flow (no hard-coded tokens)
- ✅ Per-brand API credentials
- ✅ Easy connection/disconnection
- ✅ Automatic token refresh
- ✅ Granular permission scopes

---

## Setup Steps

### 1. Create Shopify Custom App

For each brand (Shopify store):

1. Go to your Shopify Admin
2. Navigate to **Settings** → **Apps and sales channels** → **Develop apps**
3. Click **Create an app**
4. Name it: "Inventory Manager" (or your choice)

### 2. Configure API Scopes

In the app configuration, request these scopes:

**Required Scopes:**
- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `read_locations`

### 3. Set Redirect URL

In **App setup** → **URLs**:

**Development:**
```
http://localhost:3002/api/shopify/callback
```

**Production:**
```
https://your-backend-domain.com/api/shopify/callback
```

### 4. Get API Credentials

After creating the app:

1. Go to **API credentials** tab
2. Copy **Client ID** (this is your `api_key`)
3. Copy **Client secret** (this is your `api_secret`)

### 5. Update Database

Run this SQL in Supabase:

```sql
-- Update brand with API credentials
UPDATE brands
SET 
  api_key = 'your-client-id-here',
  api_secret = 'your-client-secret-here',
  shopify_domain = 'your-store.myshopify.com'
WHERE name = 'Tetiano';  -- or '98'
```

### 6. Connect via UI

1. Go to **Settings** → **Brands** in the app
2. Click **Connect to Shopify** for the brand
3. You'll be redirected to Shopify to authorize
4. After authorization, you'll be redirected back
5. Done! The brand is now connected

---

## OAuth Flow

```
User clicks "Connect"
    ↓
Backend generates state (CSRF token)
    ↓
Redirect to Shopify OAuth page
    ↓
User authorizes app
    ↓
Shopify redirects to callback with code
    ↓
Backend exchanges code for access_token
    ↓
Backend stores token in database
    ↓
Redirect user back to app
```

---

## API Endpoints

### Initiate OAuth
```
GET /api/shopify/auth?shop=store.myshopify.com&brand_id=xxx
```

**Headers:**
- `Authorization: Bearer <jwt-token>`

**Response:**
- Redirects to Shopify OAuth page

### OAuth Callback
```
GET /api/shopify/callback?code=xxx&shop=xxx&state=xxx
```

**Response:**
- Redirects to frontend with success/error message

### Disconnect Brand
```
POST /api/shopify/disconnect/:brandId
```

**Headers:**
- `Authorization: Bearer <jwt-token>`

**Response:**
```json
{
  "success": true,
  "message": "Brand disconnected successfully"
}
```

### Get OAuth Status
```
GET /api/shopify/status/:brandId
```

**Headers:**
- `Authorization: Bearer <jwt-token>`

**Response:**
```json
{
  "connected": true,
  "shop": "store.myshopify.com",
  "connected_at": "2024-01-15T10:30:00Z",
  "is_active": true,
  "scopes": ["read_products", "write_products", ...],
  "last_sync_at": "2024-01-15T12:00:00Z"
}
```

---

## Security Features

### CSRF Protection
- Random state token generated for each OAuth flow
- State verified on callback
- Stored in database with expiration

### HMAC Verification
- Optional HMAC verification on callback
- Prevents tampering with OAuth parameters

### Token Storage
- Access tokens stored encrypted in Supabase
- Never exposed to frontend
- Used only by backend for API calls

### Scopes
- Minimal required scopes requested
- User sees exactly what permissions are needed
- Can be revoked anytime from Shopify admin

---

## Troubleshooting

### "Invalid redirect URI"
- Make sure redirect URI in Shopify app matches exactly
- Include protocol (http:// or https://)
- No trailing slash

### "Invalid state parameter"
- State might have expired (1 hour timeout)
- Try connecting again
- Check database for orphaned states

### "HMAC verification failed"
- Check that api_secret is correct
- Ensure no URL encoding issues

### "Brand not found or API key not configured"
- Make sure brand has api_key set in database
- Check brand_id is correct

---

## Migration from Hard-coded Tokens

If you're migrating from hard-coded tokens:

1. Keep existing tokens in `.env` for backward compatibility
2. Add OAuth support (migrations 004, 005, 007)
3. Configure API credentials in database
4. Connect brands via OAuth
5. Once connected, old tokens are ignored
6. Remove old tokens from `.env` when ready

---

## Environment Variables

### Backend

```bash
# OAuth redirect URI
SHOPIFY_REDIRECT_URI=http://localhost:3002/api/shopify/callback

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:5173

# Legacy tokens (optional, for backward compatibility)
SHOPIFY_TETIANO_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_98_ACCESS_TOKEN=shpat_xxxxx
```

### Frontend

```bash
# API URL
VITE_API_URL=http://localhost:3002
```

---

## Testing OAuth Flow

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login to app
4. Go to Settings → Brands
5. Click "Connect to Shopify"
6. Authorize in Shopify
7. Check that you're redirected back with success message
8. Verify brand shows as "Connected"
9. Try "Sync Now" to test API access

---

## Production Deployment

### Update Redirect URI

In Shopify app settings, add production redirect URI:
```
https://your-backend.com/api/shopify/callback
```

### Update Environment Variables

```bash
SHOPIFY_REDIRECT_URI=https://your-backend.com/api/shopify/callback
FRONTEND_URL=https://your-frontend.com
NODE_ENV=production
```

### SSL Required

- Shopify requires HTTPS for OAuth in production
- Use SSL certificate for your backend domain
- Vercel/Render provide SSL automatically

---

## Best Practices

1. **Never commit API secrets** - Use environment variables
2. **Rotate tokens regularly** - Disconnect and reconnect brands
3. **Monitor OAuth states** - Clean up expired states
4. **Log OAuth events** - Track successful/failed connections
5. **Handle errors gracefully** - Show user-friendly messages
6. **Test thoroughly** - Test OAuth flow in development first

---

## Support

For issues:
1. Check Shopify app logs
2. Check backend logs
3. Verify database state
4. Test with Shopify's OAuth tester
5. Contact Shopify Partner support if needed
