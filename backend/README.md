# Tetiano Backend API

Node.js + Express + TypeScript backend for Tetiano Inventory Management System.

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Environment Variables

Required:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `PORT` (default: 3002)
- `NODE_ENV`
- `FRONTEND_URL`

## API Endpoints

- `GET /health` - Health check
- `POST /api/auth/*` - Authentication
- `GET /api/inventory` - Inventory management
- `GET /api/orders` - Orders
- `GET /api/reports` - Daily reports
- `GET /api/admin/*` - Admin panel

## Deployment

### Railway
Set Root Directory to `backend` in Railway Dashboard.

### Environment
Make sure all environment variables are set in Railway Variables.

## License

MIT
