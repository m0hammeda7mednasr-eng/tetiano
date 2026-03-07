# Changelog

All notable changes to the Tetiano Inventory System project.

## [2.0.0] - 2026-03-07

### 🎉 Major Release - Complete Professional Rebuild

This release represents a complete overhaul of the system with professional-grade features, comprehensive documentation, and production-ready code.

---

### 🗄️ Database

#### Added

- **Complete Schema Migration** (`001_complete_schema.sql`)
  - 22 tables with proper relationships
  - Comprehensive indexes for performance
  - Triggers for automatic updates
  - Row Level Security (RLS) policies
  - Cleanup jobs for expired data

- **New Tables:**
  - `shopify_oauth_states` - OAuth state management with expiration
  - `shopify_connections` - Track Shopify connection status
  - `shopify_webhook_events` - Store and track webhook events
  - `stock_movements` - Complete inventory movement history
  - `audit_logs` - Comprehensive audit trail
  - `store_permissions_overrides` - Custom permission management
  - `report_attachments` - File attachments for reports
  - `report_comments` - Comments on reports

#### Changed

- **Unified Terminology:** Standardized on `store_id` (brands now reference stores)
- **Improved Relationships:** Proper foreign keys and cascading deletes
- **Better Indexes:** Optimized for common query patterns

#### Fixed

- Schema compatibility issues across all tables
- Missing columns and constraints
- Duplicate key violations
- NULL constraint violations

---

### 🔧 Backend

#### Added

- **Webhook Idempotency** (`backend/src/routes/webhooks.ts`)
  - Duplicate webhook detection using `webhook_id`
  - Prevents double-processing of events
  - Database-backed idempotency checks

- **Input Validation Middleware** (`backend/src/middleware/validator.ts`)
  - Comprehensive validation for all input types
  - Support for: string, number, email, uuid, url, array, object
  - Custom validation rules
  - Clear error messages

- **Rate Limiting** (`backend/src/routes/webhooks.ts`)
  - 1000 requests/minute per store for webhooks
  - 100 requests/minute per user for API
  - Rate limit headers in responses
  - Per-store and per-IP limiting

- **Audit Logging** (`backend/src/utils/auditLogger.ts`)
  - Automatic logging of all critical operations
  - Before/after state tracking
  - User attribution
  - Metadata support

- **Retry Logic** (`frontend/src/lib/api.ts`)
  - Automatic retry on network errors
  - Exponential backoff (1s, 2s)
  - Configurable retry count
  - 30-second timeout

#### Changed

- **Simplified Permission System** (`backend/src/middleware/auth.ts`)
  - Role-based permissions with fallbacks
  - Custom permission overrides
  - Cleaner permission checking
  - Better error messages

- **Improved Error Handling**
  - Schema compatibility error detection
  - Duplicate key error handling
  - Clear error codes and messages
  - Comprehensive logging

- **Better OAuth Flow** (`backend/src/routes/shopifyOAuth.ts`)
  - State expiration handling
  - Multiple credential lookup strategies
  - Improved error messages
  - Automatic webhook registration

#### Fixed

- 500 errors on `/api/app/shopify/connect`
- Duplicate shop domain errors
- Missing store_id context errors
- OAuth state storage issues
- Webhook processing failures

---

### 🎨 Frontend

#### Added

- **Automatic Retry Logic** (`frontend/src/lib/api.ts`)
  - Retry on network errors and 5xx responses
  - Exponential backoff
  - Configurable timeout

- **Better Loading States** (`frontend/src/store/authStore.ts`)
  - Initialization tracking
  - Proper async handling
  - Loading indicators

#### Changed

- **Improved Error Handling**
  - User-friendly error messages
  - Toast notifications
  - Better error recovery

- **Updated Environment Variables** (`frontend/.env.example`)
  - Clear comments
  - Sensible defaults
  - Production examples

#### Fixed

- Silent API failures
- Missing error messages
- Stale authentication state
- Loading state issues

---

### 📚 Documentation

#### Added

- **Comprehensive Setup Guide** (`SETUP_GUIDE.md`)
  - Step-by-step instructions for Supabase, Railway, Vercel, Shopify
  - Environment variable documentation
  - Testing and verification steps
  - Launch checklist

- **Troubleshooting Guide** (`docs/troubleshooting.md`)
  - 8 common errors with solutions
  - Diagnostic tools and queries
  - SQL scripts for fixes
  - Diagnostic checklist

- **API Documentation** (`docs/api.md`)
  - Complete endpoint documentation
  - Request/response examples
  - Error codes and handling
  - Rate limiting details
  - Permission requirements
  - Webhook setup guide

- **Complete Fix Plan** (`COMPLETE_FIX_PLAN.md`)
  - Detailed breakdown of all fixes
  - Phase-by-phase completion status
  - Statistics and metrics
  - Next steps

#### Changed

- Updated README with current information
- Improved code comments
- Better inline documentation

---

### 🔒 Security

#### Added

- Input validation on all endpoints
- Rate limiting on webhooks and API
- Audit logging for all operations
- Row Level Security (RLS) policies

#### Changed

- Improved JWT token handling
- Better permission checking
- Secure OAuth state management

#### Fixed

- Potential SQL injection vectors
- Missing input validation
- Weak permission checks

---

### ⚡ Performance

#### Added

- Database indexes on frequently queried columns
- Connection pooling
- Query optimization

#### Changed

- Pagination on all list endpoints
- Efficient database queries
- Reduced N+1 queries

#### Fixed

- Slow dashboard queries
- Inefficient product listing
- Missing indexes

---

### 🐛 Bug Fixes

#### Database

- Fixed NULL constraint violations in stores table
- Fixed duplicate key errors in brands table
- Fixed missing shopify_oauth_states table
- Fixed schema compatibility issues

#### Backend

- Fixed 500 errors on Shopify connect
- Fixed "store_id context is required" errors
- Fixed "Invalid or expired token" errors
- Fixed duplicate webhook processing
- Fixed OAuth state expiration handling

#### Frontend

- Fixed silent API failures
- Fixed stale authentication state
- Fixed missing error messages
- Fixed loading state issues

---

### 🔄 Breaking Changes

#### Database

- **Migration Required:** Must run `001_complete_schema.sql`
- **Data Migration:** Old data needs to be migrated to new schema
- **Terminology Change:** `brand_id` → `store_id` in most contexts

#### Backend

- **Environment Variables:** New required variables (see SETUP_GUIDE.md)
- **API Changes:** Some endpoints have new response formats
- **Permission System:** New permission keys (backward compatible)

#### Frontend

- **Environment Variables:** Updated `.env.example` format
- **API Client:** New retry logic may affect timing

---

### 📦 Dependencies

#### Added

- `express-rate-limit` - Rate limiting middleware

#### Updated

- All dependencies to latest stable versions
- Security patches applied

---

### 🧪 Testing

#### Added

- Health check endpoint
- Diagnostic SQL queries
- Testing documentation

#### Changed

- Improved error messages for debugging
- Better logging for troubleshooting

---

### 📝 Notes

#### Migration Path

1. Backup existing database
2. Run `001_complete_schema.sql` in Supabase
3. Run `SETUP_DATABASE.sql` for initial data
4. Update environment variables in Railway and Vercel
5. Deploy backend and frontend
6. Test all critical flows

#### Known Issues

- None at this time

#### Deprecations

- Old migration files (replaced by single comprehensive migration)
- Legacy permission keys (still supported but deprecated)

---

### 👥 Contributors

- Development Team

---

### 🔗 Links

- [Setup Guide](SETUP_GUIDE.md)
- [Troubleshooting](docs/troubleshooting.md)
- [API Documentation](docs/api.md)
- [Complete Fix Plan](COMPLETE_FIX_PLAN.md)

---

## [1.0.0] - 2026-02-01

### Initial Release

- Basic inventory management
- Shopify integration
- User authentication
- Order tracking
- Daily reports

---

**For detailed information about any changes, see the respective documentation files.**
