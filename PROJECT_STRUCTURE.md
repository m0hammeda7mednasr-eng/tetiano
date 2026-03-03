# Project Structure

```
inventory-management/
├── README.md                          # Project overview
├── SETUP.md                           # Setup instructions
├── PROJECT_STRUCTURE.md               # This file
├── .gitignore                         # Git ignore rules
│
├── docs/                              # Documentation
│   ├── api.md                         # API documentation
│   ├── deployment.md                  # Deployment guide
│   ├── architecture.md                # System architecture
│   └── features.md                    # Feature documentation
│
├── supabase/                          # Database migrations
│   └── migrations/
│       ├── 001_initial_schema.sql     # Tables and indexes
│       ├── 002_rls_policies.sql       # Row Level Security
│       └── 003_seed_data.sql          # Initial data
│
├── backend/                           # Node.js backend
│   ├── package.json                   # Dependencies
│   ├── tsconfig.json                  # TypeScript config
│   ├── .env.example                   # Environment template
│   ├── .eslintrc.json                 # ESLint config
│   │
│   └── src/
│       ├── index.ts                   # Entry point
│       │
│       ├── config/                    # Configuration
│       │   ├── supabase.ts            # Supabase client
│       │   └── shopify.ts             # Shopify config
│       │
│       ├── middleware/                # Express middleware
│       │   ├── auth.ts                # Authentication
│       │   └── errorHandler.ts        # Error handling
│       │
│       ├── services/                  # Business logic
│       │   ├── shopify.ts             # Shopify API client
│       │   ├── inventory.ts           # Inventory operations
│       │   └── webhookHandler.ts      # Webhook processing
│       │
│       ├── routes/                    # API routes
│       │   ├── webhooks.ts            # Webhook endpoints
│       │   ├── inventory.ts           # Inventory endpoints
│       │   ├── reports.ts             # Daily reports
│       │   ├── notifications.ts       # Notifications
│       │   └── teams.ts               # Team management
│       │
│       ├── jobs/                      # Scheduled jobs
│       │   └── index.ts               # Cron jobs
│       │
│       ├── scripts/                   # Utility scripts
│       │   └── seed.ts                # Database seeding
│       │
│       └── utils/                     # Utilities
│           └── logger.ts              # Winston logger
│
└── frontend/                          # React frontend
    ├── package.json                   # Dependencies
    ├── tsconfig.json                  # TypeScript config
    ├── tsconfig.node.json             # Node TypeScript config
    ├── vite.config.ts                 # Vite config
    ├── tailwind.config.js             # Tailwind config
    ├── postcss.config.js              # PostCSS config
    ├── .env.example                   # Environment template
    ├── .eslintrc.json                 # ESLint config
    ├── index.html                     # HTML template
    │
    └── src/
        ├── main.tsx                   # Entry point
        ├── App.tsx                    # Root component
        ├── index.css                  # Global styles
        │
        ├── lib/                       # Libraries
        │   ├── supabase.ts            # Supabase client
        │   └── api.ts                 # Axios instance
        │
        ├── store/                     # State management
        │   └── authStore.ts           # Auth state (Zustand)
        │
        ├── components/                # React components
        │   ├── Layout.tsx             # Main layout
        │   ├── StockAdjustModal.tsx   # Stock adjustment
        │   └── StockLedgerModal.tsx   # Ledger view
        │
        └── pages/                     # Page components
            ├── Login.tsx              # Login page
            ├── Signup.tsx             # Signup page
            ├── Dashboard.tsx          # Dashboard
            ├── Inventory.tsx          # Inventory management
            └── DailyReports.tsx       # Daily reports
```

## Key Files Explained

### Backend

**Entry Point**
- `src/index.ts` - Express app setup, middleware, routes

**Configuration**
- `src/config/supabase.ts` - Supabase client with service role
- `src/config/shopify.ts` - Shopify credentials and API version

**Middleware**
- `src/middleware/auth.ts` - JWT verification, role checking
- `src/middleware/errorHandler.ts` - Global error handler

**Services**
- `src/services/shopify.ts` - Shopify GraphQL client, inventory operations
- `src/services/inventory.ts` - Stock management, ledger recording
- `src/services/webhookHandler.ts` - Webhook processing, idempotency

**Routes**
- `src/routes/webhooks.ts` - Shopify webhook endpoint with HMAC verification
- `src/routes/inventory.ts` - Inventory CRUD, adjustments, movements
- `src/routes/reports.ts` - Daily report submission and viewing
- `src/routes/notifications.ts` - Notification management
- `src/routes/teams.ts` - Team and member management

**Jobs**
- `src/jobs/index.ts` - Cron job for daily report reminders

**Scripts**
- `src/scripts/seed.ts` - Database seeding with sample data

### Frontend

**Entry Point**
- `src/main.tsx` - React app initialization
- `src/App.tsx` - Router setup, private routes

**Libraries**
- `src/lib/supabase.ts` - Supabase client for auth
- `src/lib/api.ts` - Axios instance with auth interceptor

**State Management**
- `src/store/authStore.ts` - Zustand store for authentication

**Components**
- `src/components/Layout.tsx` - Navigation, header, notifications
- `src/components/StockAdjustModal.tsx` - Modal for stock adjustments
- `src/components/StockLedgerModal.tsx` - Modal for viewing ledger

**Pages**
- `src/pages/Login.tsx` - Login form
- `src/pages/Signup.tsx` - Signup form
- `src/pages/Dashboard.tsx` - Stats and quick actions
- `src/pages/Inventory.tsx` - Inventory table with search
- `src/pages/DailyReports.tsx` - Daily report form

### Database

**Migrations**
- `001_initial_schema.sql` - All tables, indexes, triggers
- `002_rls_policies.sql` - Row Level Security policies
- `003_seed_data.sql` - Initial brands and team

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database Client**: @supabase/supabase-js
- **HTTP Client**: Axios
- **Scheduler**: node-cron
- **Logger**: Winston

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Router**: React Router v6
- **State**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Utils**: date-fns

### Database
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Security**: Row Level Security (RLS)

### External Services
- **Shopify**: Admin API (GraphQL)
- **Deployment**: Vercel (Frontend), Render/Fly.io (Backend)

## Development Workflow

1. **Setup**
   ```bash
   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure**
   - Copy `.env.example` to `.env` in both folders
   - Fill in Supabase and Shopify credentials

3. **Database**
   - Run migrations in Supabase SQL Editor
   - Run seed script: `cd backend && npm run seed`

4. **Development**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

5. **Testing**
   - Sign up a user
   - Assign to team with admin role (SQL)
   - Configure Shopify webhooks
   - Test inventory sync

## Deployment

1. **Database**: Already on Supabase
2. **Backend**: Deploy to Render or Fly.io
3. **Frontend**: Deploy to Vercel
4. **Configure**: Update environment variables
5. **Webhooks**: Point Shopify to production backend

See `docs/deployment.md` for detailed instructions.

## Security Considerations

- Never commit `.env` files
- Use service role key only in backend
- Enable RLS on all tables
- Verify webhook HMAC signatures
- Use HTTPS in production
- Implement rate limiting (future)
- Regular security audits

## Maintenance

- Monitor logs regularly
- Check webhook delivery status
- Review error rates
- Update dependencies
- Backup database
- Test disaster recovery
- Document changes
