# 🎯 System Requirements & Architecture Specification

## 📋 Project Overview

**System Name**: Tetiano Multi-Brand Inventory Management System  
**Type**: Multi-tenant SaaS Platform  
**Purpose**: Complete inventory and order management for multiple Shopify stores with advanced access control

---

## 🏗️ Core Architecture Requirements

### 1. Multi-Tenant Structure

```
System Level
    ├── Super Admin (Platform Owner)
    │
    ├── Brand 1 (Store Owner)
    │   ├── Admin Dashboard
    │   ├── Users (Staff/Managers)
    │   ├── Shopify Store Connection
    │   ├── Products & Inventory
    │   ├── Orders & Revenue
    │   └── Reports
    │
    ├── Brand 2 (Store Owner)
    │   ├── Admin Dashboard
    │   ├── Users (Staff/Managers)
    │   ├── Shopify Store Connection
    │   ├── Products & Inventory
    │   ├── Orders & Revenue
    │   └── Reports
    │
    └── Brand N...
```

### 2. Isolation Requirements

**CRITICAL**: Each brand MUST be completely isolated:
- ❌ Brand A cannot see Brand B's data
- ❌ Brand A users cannot access Brand B dashboard
- ❌ Brand A admin cannot manage Brand B users
- ✅ Each brand has its own independent dashboard
- ✅ Each brand manages its own users
- ✅ Each brand connects to its own Shopify store

---

## 👥 User Roles & Permissions

### Role Hierarchy

```
1. Super Admin (Platform Level)
   - Manages all brands
   - Creates new brand accounts
   - System-wide analytics
   - Platform settings

2. Brand Owner/Admin (Brand Level)
   - Full access to their brand only
   - Manages brand users
   - Connects Shopify store
   - Views all reports and analytics
   - Sees net profit and costs
   - Manages inventory
   - Handles orders

3. Brand Manager (Brand Level)
   - Limited admin access
   - Can manage users
   - Can view reports
   - Can manage inventory
   - Cannot see costs/net profit

4. Brand Staff (Brand Level)
   - View-only access
   - Can submit daily reports
   - Can view assigned products
   - Cannot manage users
   - Cannot see financial data

5. Brand Viewer (Brand Level)
   - Read-only access
   - Can view inventory
   - Can view orders
   - Cannot modify anything
```

### Detailed Permissions Matrix

| Feature | Super Admin | Brand Admin | Manager | Staff | Viewer |
|---------|-------------|-------------|---------|-------|--------|
| **User Management** |
| Create users | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| Delete users | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| Assign roles | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| View users | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| **Shopify Integration** |
| Connect store | ✅ All brands | ✅ Own brand | ❌ | ❌ | ❌ |
| Disconnect store | ✅ All brands | ✅ Own brand | ❌ | ❌ | ❌ |
| Sync products | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| View webhooks | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| **Inventory Management** |
| View inventory | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Assigned | ✅ Own brand |
| Edit inventory | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Assigned | ❌ |
| Adjust stock | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Assigned | ❌ |
| View stock history | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Assigned | ✅ Own brand |
| **Orders Management** |
| View orders | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Own brand | ✅ Own brand |
| Edit orders | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| Cancel orders | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| **Financial Data** |
| View revenue | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| View costs | ✅ All brands | ✅ Own brand | ❌ | ❌ | ❌ |
| View net profit | ✅ All brands | ✅ Own brand | ❌ | ❌ | ❌ |
| Edit costs | ✅ All brands | ✅ Own brand | ❌ | ❌ | ❌ |
| **Reports** |
| View reports | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Own brand | ✅ Own brand |
| Submit reports | ✅ All brands | ✅ Own brand | ✅ Own brand | ✅ Own brand | ❌ |
| Delete reports | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |
| Export reports | ✅ All brands | ✅ Own brand | ✅ Own brand | ❌ | ❌ |

---

## 🔐 Authentication & Access Control

### Authentication Flow

```
1. User Login
   ↓
2. Verify Credentials (Supabase Auth)
   ↓
3. Load User Profile
   ↓
4. Identify Brand Association
   ↓
5. Load Brand-Specific Permissions
   ↓
6. Redirect to Appropriate Dashboard
   ↓
7. Apply RLS Policies (Row Level Security)
```

### Database RLS Policies

**CRITICAL**: All tables MUST have RLS policies that enforce brand isolation:

```sql
-- Example: Products table RLS
CREATE POLICY "Users can only see their brand's products"
ON products
FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id 
    FROM user_brand_access 
    WHERE user_id = auth.uid()
  )
);

-- Example: Orders table RLS
CREATE POLICY "Users can only see their brand's orders"
ON orders
FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id 
    FROM user_brand_access 
    WHERE user_id = auth.uid()
  )
);
```

---

## 🛍️ Shopify Integration Requirements

### 1. Store Connection (OAuth)

**Flow**:
```
1. Brand Admin clicks "Connect Shopify Store"
   ↓
2. System generates OAuth URL with brand-specific state
   ↓
3. Redirect to Shopify authorization page
   ↓
4. User approves permissions
   ↓
5. Shopify redirects back with code
   ↓
6. System exchanges code for access token
   ↓
7. Store access token in database (encrypted)
   ↓
8. Associate token with brand_id
   ↓
9. Start initial sync
```

**Required Shopify Permissions**:
- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `write_orders`
- `read_locations`
- `read_price_rules`
- `read_customers`

### 2. Bi-Directional Sync

**Shopify → System** (via Webhooks):
```
Webhooks to implement:
├── products/create
├── products/update
├── products/delete
├── orders/create
├── orders/updated
├── orders/cancelled
├── inventory_levels/update
└── inventory_levels/connect
```

**System → Shopify** (via API):
```
Actions to sync:
├── Update product details
├── Update inventory quantities
├── Update product prices
├── Update product status (active/draft)
└── Fulfill orders
```

**Sync Rules**:
- ✅ Real-time sync via webhooks
- ✅ Fallback: Scheduled sync every 15 minutes
- ✅ Conflict resolution: Shopify is source of truth
- ✅ Audit log for all sync operations
- ✅ Error handling with retry mechanism

---

## 📦 Inventory Management

### Features Required

1. **Product Management**
   - View all products from Shopify
   - Edit product details (syncs to Shopify)
   - Update stock quantities
   - Set low stock alerts
   - Track stock history
   - Bulk operations

2. **Stock Adjustments**
   ```
   Adjustment Types:
   ├── Manual adjustment (with reason)
   ├── Damage/Loss
   ├── Return
   ├── Transfer
   └── Correction
   ```

3. **Stock History**
   - Track all changes
   - Show who made the change
   - Show timestamp
   - Show reason
   - Show before/after values

4. **Low Stock Alerts**
   - Configurable threshold per product
   - Email notifications
   - Dashboard notifications
   - Alert history

---

## 📊 Reports System

### 1. Daily Reports

**Submission Methods**:
- ✅ Text input
- ✅ Voice recording (with transcription)
- ✅ Image upload (with OCR)
- ✅ File attachments

**Report Structure**:
```typescript
interface DailyReport {
  id: string;
  brand_id: string;
  user_id: string;
  date: string;
  type: 'text' | 'voice' | 'image' | 'file';
  content: string;
  attachments: string[];
  transcription?: string; // For voice
  ocr_text?: string; // For images
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}
```

**Features**:
- Submit daily reports
- View report history
- Filter by date/user/type
- Export reports
- Approve/reject reports (managers only)
- Comments on reports

### 2. Analytics Reports

**Sales Analytics**:
- Total revenue
- Revenue by product
- Revenue by date range
- Revenue trends
- Top selling products
- Sales by channel

**Inventory Analytics**:
- Stock levels
- Stock movements
- Low stock items
- Out of stock items
- Stock value
- Turnover rate

**Order Analytics**:
- Total orders
- Orders by status
- Average order value
- Orders by date range
- Fulfillment rate
- Cancellation rate

---

## 💰 Financial Management

### Cost & Profit Tracking

**CRITICAL**: Financial data visibility based on role:
- ✅ Brand Admin: Sees everything (revenue, costs, net profit)
- ❌ Manager: Sees revenue only
- ❌ Staff: Sees nothing
- ❌ Viewer: Sees nothing

**Data Structure**:
```typescript
interface OrderFinancials {
  order_id: string;
  brand_id: string;
  
  // Revenue (visible to managers+)
  gross_revenue: number;
  discounts: number;
  net_revenue: number;
  
  // Costs (visible to admins only)
  product_cost: number;
  shipping_cost: number;
  platform_fees: number;
  payment_fees: number;
  other_costs: number;
  total_costs: number;
  
  // Profit (visible to admins only)
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
}
```

**Features**:
- Set product costs
- Track order costs
- Calculate profit per order
- Calculate profit per product
- Profit trends
- Cost analysis
- Export financial reports

---

## 👤 User Management

### User Creation Flow

```
1. Admin clicks "Create User"
   ↓
2. Fill form:
   - Email
   - Full Name
   - Role
   - Password (optional - auto-generate if empty)
   - Brand assignment (auto-assigned to admin's brand)
   ↓
3. System creates Supabase auth user
   ↓
4. System creates user profile
   ↓
5. System creates brand association
   ↓
6. System sends welcome email with credentials
   ↓
7. User receives email and can login
```

### User Invitation Flow

```
1. Admin clicks "Invite User"
   ↓
2. Fill form:
   - Email
   - Role
   ↓
3. System creates invitation record
   ↓
4. System sends invitation email
   ↓
5. User clicks link in email
   ↓
6. User sets password and completes profile
   ↓
7. User can login
```

### Access Request Flow

```
1. User requests access to specific brand
   ↓
2. System creates access request
   ↓
3. Brand admin receives notification
   ↓
4. Admin reviews request
   ↓
5. Admin approves/rejects
   ↓
6. User receives notification
   ↓
7. If approved: User gains access
```

---

## 🎨 Dashboard Requirements

### Super Admin Dashboard

**Sections**:
1. **Overview**
   - Total brands
   - Total users
   - Total revenue (all brands)
   - System health

2. **Brands Management**
   - List all brands
   - Create new brand
   - View brand details
   - Deactivate brand

3. **System Analytics**
   - Platform-wide statistics
   - Usage metrics
   - Performance metrics

### Brand Admin Dashboard

**Sections**:
1. **Overview**
   - Revenue (today, week, month)
   - Orders (pending, fulfilled, cancelled)
   - Low stock alerts
   - Recent activities

2. **Financial Summary** (Admin only)
   - Gross revenue
   - Total costs
   - Net profit
   - Profit margin
   - Revenue vs Cost chart

3. **Quick Actions**
   - Sync Shopify
   - Create user
   - View reports
   - Manage inventory

4. **Recent Orders**
   - Last 10 orders
   - Status
   - Quick actions

5. **Alerts & Notifications**
   - Low stock
   - Pending reports
   - Access requests
   - System notifications

### Manager Dashboard

**Sections**:
1. **Overview**
   - Revenue (today, week, month)
   - Orders summary
   - Inventory summary
   - Team performance

2. **Team Management**
   - Active users
   - Recent reports
   - Pending approvals

3. **Inventory Overview**
   - Low stock items
   - Recent adjustments
   - Stock value

### Staff Dashboard

**Sections**:
1. **My Tasks**
   - Assigned products
   - Pending reports
   - Notifications

2. **Quick Actions**
   - Submit report
   - View inventory
   - View orders

3. **Recent Activity**
   - My recent actions
   - Team updates

---

## 📱 UI/UX Requirements

### Design Principles

1. **Brand Isolation Visual Cues**
   - Each brand has a color theme
   - Brand logo in header
   - Brand name always visible
   - Clear indication of current brand context

2. **Role-Based UI**
   - Hide features user doesn't have access to
   - Show disabled state for restricted actions
   - Clear permission indicators

3. **Responsive Design**
   - Mobile-first approach
   - Works on tablets
   - Desktop optimized

4. **Arabic Support**
   - RTL layout
   - Arabic fonts
   - Arabic date formats
   - Arabic number formats

### Key Pages

1. **Login Page**
   - Email/password
   - Remember me
   - Forgot password
   - Clean, professional design

2. **Dashboard** (role-specific)
   - Overview cards
   - Charts and graphs
   - Quick actions
   - Recent activity

3. **Products Page**
   - List view with filters
   - Search functionality
   - Bulk actions
   - Quick edit

4. **Inventory Page**
   - Stock levels
   - Adjust stock modal
   - Stock history
   - Low stock alerts

5. **Orders Page**
   - List with filters
   - Order details
   - Status updates
   - Financial info (role-based)

6. **Reports Page**
   - Submit report
   - View reports
   - Filter by date/user
   - Export functionality

7. **Users Page** (admin/manager)
   - User list
   - Create user
   - Edit user
   - Manage permissions

8. **Settings Page**
   - Profile settings
   - Brand settings (admin)
   - Shopify connection (admin)
   - Notifications preferences

---

## 🗄️ Database Schema Requirements

### Core Tables

```sql
-- Brands (Stores)
CREATE TABLE brands (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  color_theme TEXT,
  shopify_domain TEXT UNIQUE,
  shopify_access_token TEXT, -- encrypted
  shopify_location_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Brand Access (Multi-brand support)
CREATE TABLE user_brand_access (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  brand_id UUID REFERENCES brands(id),
  role TEXT NOT NULL, -- 'admin', 'manager', 'staff', 'viewer'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  title TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price DECIMAL(10,2),
  cost DECIMAL(10,2), -- Only visible to admins
  compare_at_price DECIMAL(10,2),
  inventory_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Inventory Adjustments
CREATE TABLE inventory_adjustments (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  product_id UUID REFERENCES products(id),
  user_id UUID REFERENCES user_profiles(id),
  adjustment_type TEXT NOT NULL, -- 'manual', 'damage', 'return', 'transfer', 'correction'
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  shopify_order_id TEXT UNIQUE,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT NOT NULL, -- 'pending', 'fulfilled', 'cancelled'
  financial_status TEXT,
  fulfillment_status TEXT,
  
  -- Revenue (visible to managers+)
  gross_revenue DECIMAL(10,2),
  discounts DECIMAL(10,2),
  net_revenue DECIMAL(10,2),
  
  -- Costs (visible to admins only)
  product_cost DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  platform_fees DECIMAL(10,2),
  payment_fees DECIMAL(10,2),
  other_costs DECIMAL(10,2),
  total_costs DECIMAL(10,2),
  
  -- Profit (visible to admins only)
  gross_profit DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  
  order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Daily Reports
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  user_id UUID REFERENCES user_profiles(id),
  report_date DATE NOT NULL,
  type TEXT NOT NULL, -- 'text', 'voice', 'image', 'file'
  content TEXT,
  attachments JSONB, -- Array of file URLs
  transcription TEXT, -- For voice reports
  ocr_text TEXT, -- For image reports
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access Requests
CREATE TABLE access_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  brand_id UUID REFERENCES brands(id),
  requested_role TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  brand_id UUID REFERENCES brands(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopify Sync Logs
CREATE TABLE shopify_sync_logs (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  sync_type TEXT NOT NULL, -- 'products', 'orders', 'inventory'
  direction TEXT NOT NULL, -- 'shopify_to_system', 'system_to_shopify'
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  records_processed INTEGER,
  errors JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 API Endpoints Required

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Brands (Super Admin)
```
GET    /api/admin/brands
POST   /api/admin/brands
GET    /api/admin/brands/:id
PATCH  /api/admin/brands/:id
DELETE /api/admin/brands/:id
```

### Users
```
GET    /api/brands/:brandId/users
POST   /api/brands/:brandId/users
GET    /api/brands/:brandId/users/:id
PATCH  /api/brands/:brandId/users/:id
DELETE /api/brands/:brandId/users/:id
POST   /api/brands/:brandId/users/invite
```

### Shopify Integration
```
GET    /api/brands/:brandId/shopify/auth-url
GET    /api/brands/:brandId/shopify/callback
POST   /api/brands/:brandId/shopify/disconnect
POST   /api/brands/:brandId/shopify/sync
GET    /api/brands/:brandId/shopify/status
POST   /api/webhooks/shopify
```

### Products
```
GET    /api/brands/:brandId/products
GET    /api/brands/:brandId/products/:id
PATCH  /api/brands/:brandId/products/:id
POST   /api/brands/:brandId/products/sync
```

### Inventory
```
GET    /api/brands/:brandId/inventory
POST   /api/brands/:brandId/inventory/adjust
GET    /api/brands/:brandId/inventory/:productId/history
GET    /api/brands/:brandId/inventory/low-stock
```

### Orders
```
GET    /api/brands/:brandId/orders
GET    /api/brands/:brandId/orders/:id
PATCH  /api/brands/:brandId/orders/:id
GET    /api/brands/:brandId/orders/:id/financials (admin only)
```

### Reports
```
GET    /api/brands/:brandId/reports
POST   /api/brands/:brandId/reports
GET    /api/brands/:brandId/reports/:id
PATCH  /api/brands/:brandId/reports/:id
DELETE /api/brands/:brandId/reports/:id
POST   /api/brands/:brandId/reports/:id/approve
POST   /api/brands/:brandId/reports/:id/reject
```

### Analytics
```
GET    /api/brands/:brandId/analytics/sales
GET    /api/brands/:brandId/analytics/inventory
GET    /api/brands/:brandId/analytics/orders
GET    /api/brands/:brandId/analytics/financials (admin only)
GET    /api/brands/:brandId/analytics/dashboard
```

### Access Requests
```
GET    /api/brands/:brandId/access-requests
POST   /api/brands/:brandId/access-requests
PATCH  /api/brands/:brandId/access-requests/:id
```

### Notifications
```
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

---

## 🎯 Implementation Priority

### Phase 1: Core Multi-Tenant (Week 1-2)
- [ ] Database schema with brand isolation
- [ ] RLS policies for all tables
- [ ] User-brand association system
- [ ] Role-based access control
- [ ] Brand-specific dashboards

### Phase 2: Shopify Integration (Week 3-4)
- [ ] OAuth connection flow
- [ ] Product sync (Shopify → System)
- [ ] Inventory sync (bi-directional)
- [ ] Order sync (Shopify → System)
- [ ] Webhook handlers
- [ ] Sync error handling

### Phase 3: Financial Management (Week 5)
- [ ] Cost tracking per product
- [ ] Order financials calculation
- [ ] Profit/loss reports
- [ ] Role-based financial visibility
- [ ] Financial analytics

### Phase 4: Reports System (Week 6)
- [ ] Daily report submission (text)
- [ ] Voice recording with transcription
- [ ] Image upload with OCR
- [ ] File attachments
- [ ] Report approval workflow
- [ ] Report analytics

### Phase 5: Advanced Features (Week 7-8)
- [ ] Access request system
- [ ] Advanced notifications
- [ ] Audit logging
- [ ] Export functionality
- [ ] Mobile optimization
- [ ] Performance optimization

---

## 🚨 Critical Requirements

### Security
- ✅ All API endpoints must verify brand access
- ✅ All database queries must include brand_id filter
- ✅ RLS policies on ALL tables
- ✅ Encrypted Shopify tokens
- ✅ Audit logs for sensitive operations
- ✅ Rate limiting per brand
- ✅ CORS properly configured

### Performance
- ✅ Database indexes on brand_id
- ✅ Pagination on all list endpoints
- ✅ Caching for frequently accessed data
- ✅ Lazy loading for large datasets
- ✅ Optimized queries (avoid N+1)

### Data Integrity
- ✅ Foreign key constraints
- ✅ Transaction handling for multi-step operations
- ✅ Conflict resolution for sync operations
- ✅ Data validation on all inputs
- ✅ Backup strategy

---

## 📝 Testing Requirements

### Unit Tests
- All API endpoints
- All business logic functions
- All utility functions

### Integration Tests
- Shopify OAuth flow
- Webhook handling
- Sync operations
- Multi-tenant isolation

### E2E Tests
- User login and navigation
- Product management
- Order processing
- Report submission

---

## 📚 Documentation Requirements

- API documentation (OpenAPI/Swagger)
- Database schema documentation
- User guides per role
- Admin setup guide
- Shopify integration guide
- Deployment guide

---

**This specification should be used as the complete reference for rebuilding/refactoring the system.**
