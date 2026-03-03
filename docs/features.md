# Feature Documentation

## 1. Multi-Brand Support

### Overview
The system supports multiple Shopify stores (brands) with separate inventory tracking.

### Configuration
Each brand is configured with:
- Shopify domain (e.g., `tetiano.myshopify.com`)
- Admin API access token
- Primary location ID for inventory

### Implementation
- Brands stored in `brands` table
- Teams can access multiple brands via `team_brands`
- All inventory data is brand-scoped
- RLS policies ensure users only see their team's brands

### Usage
1. Add brand in database
2. Configure environment variables for Shopify credentials
3. Assign brand access to teams
4. Sync products from Shopify

## 2. Real-time Inventory Sync

### Overview
Inventory levels are automatically synchronized with Shopify using webhooks.

### Webhook Topics
- `inventory_levels/update` - Direct inventory changes
- `orders/create` - New orders reduce stock
- `orders/paid` - Paid orders (if not handled by create)
- `orders/cancelled` - Cancelled orders restore stock
- `refunds/create` - Refunds with restocking

### Flow
1. Shopify sends webhook to backend
2. Backend verifies HMAC signature
3. Check idempotency (prevent duplicate processing)
4. Update local inventory
5. Record stock movement in ledger
6. Store webhook event

### Security
- HMAC-SHA256 signature verification
- Event hash for idempotency
- Async processing to respond quickly

### Monitoring
- Check `shopify_webhook_events` table
- Monitor webhook delivery in Shopify admin
- Review error logs

## 3. Manual Stock Adjustments

### Overview
Authorized users can manually adjust inventory with required reason.

### Permissions
- Requires `operator` role or higher
- Must provide reason/comment
- Cannot result in negative stock

### Process
1. User selects variant
2. Enters adjustment delta (+/-)
3. Provides reason
4. System validates
5. Calls Shopify API to adjust
6. Updates local inventory
7. Records movement in ledger

### Audit Trail
Every adjustment records:
- User who made change
- Delta amount
- Previous and new quantities
- Reason
- Timestamp

### Use Cases
- Damaged goods removal
- Found inventory
- Correction of errors
- Physical count adjustments

## 4. Stock Movement Ledger

### Overview
Complete audit trail of all inventory changes.

### Recorded Information
- Variant ID
- Brand ID
- Delta (change amount)
- Previous quantity
- New quantity
- Source (webhook, manual, order, refund, sync)
- Reason/description
- Reference ID (order/refund ID if applicable)
- User ID (for manual changes)
- Timestamp

### Sources
- `webhook` - Shopify webhook update
- `manual` - User adjustment
- `sync` - Initial sync from Shopify
- `order` - Order created/paid
- `refund` - Refund with restock
- `adjustment` - Other adjustments

### UI Features
- View ledger per variant
- Filter by date range
- Color-coded by source
- Shows user who made change
- Displays before/after quantities

## 5. Team Management

### Overview
Users are organized into teams with role-based permissions.

### Roles

**Admin**
- Full system access
- Manage teams and members
- Assign brand access
- All lower role permissions

**Manager**
- Manage team members
- Sync products from Shopify
- View all reports
- All lower role permissions

**Operator**
- Adjust inventory
- Submit daily reports
- View inventory
- All lower role permissions

**Viewer**
- View inventory (read-only)
- View reports (read-only)
- Submit own daily reports

### Team Structure
- Teams can access multiple brands
- Users can belong to multiple teams
- Each team-user relationship has a role
- RLS policies enforce access control

### Implementation
- `teams` table
- `team_members` table (user-team-role)
- `team_brands` table (team-brand access)
- Helper functions for permission checks

## 6. Daily Team Reports

### Overview
Team members submit daily progress reports.

### Report Fields
- **Done Today** (required) - Accomplishments
- **Blockers** (optional) - Challenges/issues
- **Plan Tomorrow** (required) - Next day goals
- **Report Date** - Defaults to today

### Features
- Submit/update report for current day
- View submission status
- Team summary view (who submitted/missing)
- Historical report viewing

### Automated Reminders

**Schedule:** Daily at 18:00 Africa/Cairo

**Process:**
1. Cron job runs at 18:00
2. Checks all team members
3. Identifies missing reports
4. Creates in-app notifications
5. Sends email notifications (optional)

**Implementation:**
- node-cron for scheduling
- Queries `daily_reports` table
- Creates `notifications` records
- Email integration ready (SendGrid/SES)

### Use Cases
- Daily standups
- Progress tracking
- Blocker identification
- Team coordination

## 7. Notifications System

### Overview
In-app notification system for important events.

### Notification Types
- Daily report reminders
- Low stock alerts (future)
- System announcements (future)
- Webhook failures (future)

### Features
- Unread count badge
- Mark as read
- Mark all as read
- Auto-refresh every 30 seconds

### Implementation
- `notifications` table
- RLS policies (users see only their notifications)
- REST API endpoints
- Frontend polling

### Future Enhancements
- Real-time updates via Supabase subscriptions
- Push notifications
- Email notifications
- Slack/Discord integration

## 8. Authentication & Authorization

### Authentication
- Supabase Auth (email/password)
- JWT tokens
- Session management
- Password reset (Supabase built-in)

### Authorization
- Role-based access control (RBAC)
- Row Level Security (RLS)
- Team-based data isolation
- API middleware for role checks

### Security Features
- Encrypted passwords (Supabase)
- Secure token storage
- HTTPS only
- CORS configuration
- Input validation

### User Flow
1. Sign up with email/password
2. Admin assigns to team with role
3. User logs in
4. JWT token stored in session
5. Token sent with API requests
6. Backend verifies token
7. RLS policies filter data

## 9. Shopify Integration

### Admin API
- GraphQL API (preferred)
- REST API (fallback)
- Version: 2024-01
- Rate limiting aware

### Operations
- Get products and variants
- Get inventory levels
- Adjust inventory
- Set inventory
- Batch operations

### Required Scopes
- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`

### Best Practices
- Use GraphQL for efficiency
- Batch operations when possible
- Handle rate limits gracefully
- Cache product data locally
- Sync periodically

## 10. Search & Filtering

### Inventory Search
Search by:
- SKU
- Product title
- Variant title
- Barcode

### Filters
- Brand
- Low stock (< 10 units)
- Product type
- Vendor

### Implementation
- PostgreSQL full-text search
- Indexed columns for performance
- Case-insensitive matching
- Pagination support

## 11. Error Handling

### Backend
- Try-catch blocks
- Structured error responses
- Winston logging
- Error middleware

### Frontend
- Error boundaries (React)
- User-friendly messages
- Retry mechanisms
- Loading states

### Monitoring
- Log errors to console/file
- Track error rates
- Alert on critical errors
- User feedback collection

## 12. Performance Optimization

### Database
- Indexes on foreign keys
- Indexes on search columns
- Connection pooling (Supabase)
- Query optimization

### Backend
- Async operations
- Webhook queue (future)
- Caching (future)
- Rate limiting (future)

### Frontend
- Code splitting
- Lazy loading
- Debounced search
- Optimistic updates
- Pagination

## 13. Data Consistency

### Shopify as Source of Truth
- Shopify inventory is authoritative
- Local DB mirrors Shopify
- Webhooks keep in sync
- Manual sync available

### Conflict Resolution
- Webhook updates override local
- Manual adjustments go through Shopify
- Idempotency prevents duplicates
- Audit trail for debugging

### Sync Strategies
- Initial full sync
- Webhook incremental updates
- Periodic reconciliation (future)
- Manual product sync

## 14. Compliance & Audit

### Audit Trail
- All stock changes logged
- User actions tracked
- Timestamps recorded
- Immutable ledger

### Data Retention
- Keep all historical data
- Archive old records (future)
- Backup regularly
- GDPR compliance ready

### Reporting
- Stock movement reports
- User activity reports
- Team performance reports
- Export capabilities (future)
