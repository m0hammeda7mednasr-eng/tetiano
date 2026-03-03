# System Architecture

## Overview

Multi-brand inventory management system with real-time Shopify synchronization, team collaboration, and audit trails.

## Architecture Diagram

```
┌─────────────┐
│   Shopify   │
│   Stores    │
└──────┬──────┘
       │ Webhooks
       │ Admin API
       ▼
┌─────────────────────────────────────┐
│          Backend (Express)          │
├─────────────────────────────────────┤
│ • Webhook Handler (HMAC verify)     │
│ • Inventory Service                 │
│ • Shopify API Client (GraphQL)      │
│ • Scheduled Jobs (Cron)             │
│ • Authentication Middleware         │
└──────────┬──────────────────────────┘
           │
           │ REST API
           │
┌──────────▼──────────────────────────┐
│      Supabase (PostgreSQL)          │
├─────────────────────────────────────┤
│ • Auth (JWT)                        │
│ • Database (RLS enabled)            │
│ • Real-time subscriptions           │
└──────────┬──────────────────────────┘
           │
           │ Supabase Client
           │
┌──────────▼──────────────────────────┐
│    Frontend (React + Vite)          │
├─────────────────────────────────────┤
│ • Auth Pages                        │
│ • Inventory Management              │
│ • Stock Adjustment                  │
│ • Daily Reports                     │
│ • Notifications                     │
└─────────────────────────────────────┘
```

## Components

### Frontend (React + TypeScript + Vite)

**Tech Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Zustand for state management
- Axios for API calls
- Supabase client for auth

**Key Features:**
- Authentication (login/signup)
- Inventory table with search
- Stock adjustment modal
- Stock ledger/audit view
- Daily report submission
- Notifications bell

**Pages:**
- `/login` - Login page
- `/signup` - Signup page
- `/` - Dashboard
- `/inventory` - Inventory management
- `/reports` - Daily reports

### Backend (Node.js + Express + TypeScript)

**Tech Stack:**
- Express.js web framework
- TypeScript for type safety
- Supabase client (service role)
- Axios for Shopify API
- node-cron for scheduled jobs
- Winston for logging

**Key Services:**

1. **Webhook Handler**
   - Verifies HMAC signatures
   - Implements idempotency
   - Routes to topic handlers
   - Processes inventory updates, orders, refunds

2. **Inventory Service**
   - Manages stock levels
   - Records movements
   - Syncs with Shopify
   - Handles manual adjustments

3. **Shopify Service**
   - GraphQL client
   - Inventory adjustments
   - Product sync
   - Batch operations

4. **Scheduled Jobs**
   - Daily report reminders (18:00 Cairo time)
   - Creates notifications
   - Email notifications (optional)

**Middleware:**
- Authentication (JWT verification)
- Role-based access control
- Error handling

### Database (Supabase PostgreSQL)

**Key Tables:**

1. **brands** - Shopify store configurations
2. **teams** - Team management
3. **team_members** - User-team relationships with roles
4. **team_brands** - Team-brand access control
5. **products** - Synced from Shopify
6. **variants** - Product variants
7. **inventory_levels** - Current stock levels
8. **stock_movements** - Complete audit trail
9. **daily_reports** - Team member reports
10. **notifications** - In-app notifications
11. **shopify_webhook_events** - Idempotency tracking
12. **user_profiles** - Extended user data

**Security:**
- Row Level Security (RLS) on all tables
- Helper functions for access control
- Service role for backend operations
- Anon key for frontend auth

### Shopify Integration

**Admin API:**
- GraphQL API (2024-01 version)
- Inventory adjustments
- Product/variant sync
- Location-based inventory

**Webhooks:**
- `inventory_levels/update`
- `orders/create`
- `orders/paid`
- `orders/cancelled`
- `refunds/create`
- `products/update`

**Security:**
- HMAC-SHA256 signature verification
- Event hash for idempotency
- Async processing

## Data Flow

### Stock Adjustment Flow

```
User → Frontend → Backend API → Shopify API
                      ↓
                  Update DB
                      ↓
              Record Movement
                      ↓
                Return Success
```

### Webhook Flow

```
Shopify → Backend Webhook Handler
              ↓
         Verify HMAC
              ↓
      Check Idempotency
              ↓
        Process Event
              ↓
         Update DB
              ↓
     Record Movement
```

### Daily Report Flow

```
Cron Job (18:00) → Check Submissions
                         ↓
                  Find Missing
                         ↓
              Create Notifications
                         ↓
                  Send Emails
```

## Security

### Authentication
- Supabase Auth (email/password)
- JWT tokens
- Session management

### Authorization
- Role-based access control (Admin, Manager, Operator, Viewer)
- Row Level Security policies
- Team-based data isolation

### API Security
- HMAC verification for webhooks
- Bearer token authentication
- Input validation
- Error handling

### Data Security
- Encrypted connections (HTTPS)
- Environment variables for secrets
- Service role key protection
- RLS policies

## Scalability

### Current Limitations
- Single region deployment
- No caching layer
- Synchronous webhook processing

### Scaling Strategies

**Database:**
- Add read replicas
- Implement connection pooling
- Add indexes for common queries
- Archive old stock movements

**Backend:**
- Horizontal scaling (multiple instances)
- Add Redis for caching
- Queue system for webhooks (Bull/BullMQ)
- Rate limiting

**Frontend:**
- CDN for static assets (Vercel handles this)
- Code splitting
- Lazy loading
- Service worker for offline support

## Monitoring

### Metrics to Track
- API response times
- Webhook processing time
- Database query performance
- Error rates
- User activity

### Logging
- Winston logger with levels
- Structured logging (JSON)
- Error tracking (consider Sentry)
- Audit trail in database

### Alerts
- Failed webhook processing
- Database connection issues
- High error rates
- Scheduled job failures

## Deployment

**Frontend:** Vercel
- Automatic deployments from Git
- Edge network
- Preview deployments

**Backend:** Render or Fly.io
- Container-based deployment
- Auto-scaling
- Health checks
- Environment variables

**Database:** Supabase
- Managed PostgreSQL
- Automatic backups
- Connection pooling
- Real-time capabilities

## Future Enhancements

1. **Real-time Updates**
   - WebSocket connections
   - Live inventory updates
   - Collaborative editing

2. **Advanced Reporting**
   - Analytics dashboard
   - Stock forecasting
   - Sales trends
   - Export capabilities

3. **Mobile App**
   - React Native app
   - Barcode scanning
   - Push notifications

4. **Integrations**
   - Multiple e-commerce platforms
   - Accounting software
   - Shipping providers
   - Email marketing

5. **AI Features**
   - Demand forecasting
   - Automatic reordering
   - Anomaly detection
   - Smart recommendations
