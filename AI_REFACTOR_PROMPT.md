# 🤖 AI Refactoring Prompt

## Context

You are an expert full-stack developer tasked with refactoring a multi-tenant inventory management system. The current system has architectural issues and needs to be rebuilt following proper multi-tenant patterns.

---

## Current System Structure

```
Repository: tetiano
├── frontend/ (React + TypeScript + Tailwind)
├── backend/ (Node.js + Express + TypeScript)
├── supabase/ (PostgreSQL + RLS)
└── docs/
```

**Current Issues**:
1. ❌ Weak brand isolation - users can potentially access other brands' data
2. ❌ Incomplete RLS policies
3. ❌ Missing role-based UI rendering
4. ❌ Financial data visible to all roles
5. ❌ No proper multi-tenant architecture
6. ❌ Shopify sync not fully bi-directional
7. ❌ Missing cost/profit tracking
8. ❌ Reports system incomplete

---

## Your Task

Refactor the ENTIRE codebase to implement a proper multi-tenant SaaS platform with the following requirements:

---

## 🎯 Core Requirements

### 1. Multi-Tenant Architecture

**CRITICAL**: Implement complete brand isolation:

```typescript
// Every user belongs to one or more brands
// Every data record belongs to exactly one brand
// Users can ONLY access data from their assigned brands

interface UserBrandAccess {
  user_id: string;
  brand_id: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  is_primary: boolean;
}
```

**Implementation Checklist**:
- [ ] Add `brand_id` to ALL data tables
- [ ] Create `user_brand_access` junction table
- [ ] Implement RLS policies on ALL tables
- [ ] Add brand context to all API requests
- [ ] Verify brand access in all endpoints
- [ ] Add brand switcher in UI (for users with multiple brands)

### 2. Role-Based Access Control (RBAC)

**Roles**:
1. **Super Admin** (platform owner)
   - Manages all brands
   - Creates new brands
   - System-wide access

2. **Brand Admin** (store owner)
   - Full access to their brand
   - Manages users
   - Sees financial data (costs, profit)
   - Connects Shopify

3. **Manager**
   - Manages users
   - Manages inventory
   - Sees revenue (NOT costs/profit)
   - Cannot connect Shopify

4. **Staff**
   - Views inventory
   - Submits reports
   - Limited access

5. **Viewer**
   - Read-only access

**Implementation Checklist**:
- [ ] Create permission matrix (see SYSTEM_REQUIREMENTS_SPEC.md)
- [ ] Implement middleware for permission checking
- [ ] Add role-based UI rendering
- [ ] Hide/disable features based on role
- [ ] Add permission checks in all API endpoints

### 3. Financial Management

**CRITICAL**: Financial data visibility:
- ✅ Brand Admin: Sees revenue, costs, net profit
- ✅ Manager: Sees revenue only
- ❌ Staff/Viewer: Sees nothing

**Data Structure**:
```typescript
interface OrderFinancials {
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

**Implementation Checklist**:
- [ ] Add cost fields to products table
- [ ] Add financial fields to orders table
- [ ] Create API endpoints with role-based filtering
- [ ] Create admin-only financial dashboard
- [ ] Add profit/loss reports
- [ ] Implement cost tracking UI

### 4. Shopify Integration

**Requirements**:
- ✅ OAuth connection per brand
- ✅ Bi-directional sync (Shopify ↔ System)
- ✅ Real-time webhooks
- ✅ Conflict resolution (Shopify is source of truth)
- ✅ Sync error handling with retry

**Webhooks to Implement**:
```
products/create
products/update
products/delete
orders/create
orders/updated
orders/cancelled
inventory_levels/update
```

**Implementation Checklist**:
- [ ] OAuth flow per brand (not global)
- [ ] Store access token per brand (encrypted)
- [ ] Webhook handlers with brand identification
- [ ] Sync products: Shopify → System
- [ ] Sync inventory: System → Shopify
- [ ] Sync orders: Shopify → System
- [ ] Handle webhook verification (HMAC)
- [ ] Implement retry logic for failed syncs
- [ ] Add sync status indicators in UI

### 5. Reports System

**Features**:
- Submit daily reports (text, voice, image, file)
- Voice transcription
- Image OCR
- Report approval workflow
- Report history and analytics

**Implementation Checklist**:
- [ ] Create reports table with brand_id
- [ ] Implement text report submission
- [ ] Implement voice recording with transcription API
- [ ] Implement image upload with OCR API
- [ ] Implement file attachments
- [ ] Create approval workflow
- [ ] Add report analytics
- [ ] Create report export functionality

---

## 🗄️ Database Changes Required

### New Tables

```sql
-- User Brand Access (CRITICAL)
CREATE TABLE user_brand_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- Add RLS
ALTER TABLE user_brand_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand access"
ON user_brand_access FOR SELECT
USING (user_id = auth.uid());
```

### Modify Existing Tables

```sql
-- Add brand_id to ALL tables that don't have it
ALTER TABLE products ADD COLUMN brand_id UUID REFERENCES brands(id);
ALTER TABLE orders ADD COLUMN brand_id UUID REFERENCES brands(id);
ALTER TABLE inventory ADD COLUMN brand_id UUID REFERENCES brands(id);
ALTER TABLE daily_reports ADD COLUMN brand_id UUID REFERENCES brands(id);
-- ... etc for all tables

-- Add financial fields to orders
ALTER TABLE orders ADD COLUMN product_cost DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN shipping_cost DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN platform_fees DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN payment_fees DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN other_costs DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN total_costs DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN gross_profit DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN net_profit DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN profit_margin DECIMAL(5,2);

-- Add cost to products
ALTER TABLE products ADD COLUMN cost DECIMAL(10,2);
```

### RLS Policies (CRITICAL)

```sql
-- Example for products table
CREATE POLICY "Users can only see their brand's products"
ON products FOR SELECT
USING (
  brand_id IN (
    SELECT brand_id 
    FROM user_brand_access 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can update their brand's products"
ON products FOR UPDATE
USING (
  brand_id IN (
    SELECT brand_id 
    FROM user_brand_access 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Repeat for ALL tables with brand_id
```

---

## 🔧 Backend Changes Required

### 1. Middleware

```typescript
// Brand context middleware
export const brandContext = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const brandId = req.params.brandId || req.query.brandId || req.body.brandId;
  
  if (!brandId) {
    return res.status(400).json({ error: 'Brand ID required' });
  }
  
  // Verify user has access to this brand
  const { data: access } = await supabase
    .from('user_brand_access')
    .select('role')
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .single();
  
  if (!access) {
    return res.status(403).json({ error: 'Access denied to this brand' });
  }
  
  req.brandId = brandId;
  req.brandRole = access.role;
  next();
};

// Permission middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.brandRole;
    
    if (!hasPermission(role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

### 2. API Routes Structure

```typescript
// All brand-specific routes should be under /api/brands/:brandId
router.use('/brands/:brandId', brandContext);

// Products
router.get('/brands/:brandId/products', requirePermission('view_products'), getProducts);
router.patch('/brands/:brandId/products/:id', requirePermission('edit_products'), updateProduct);

// Orders
router.get('/brands/:brandId/orders', requirePermission('view_orders'), getOrders);
router.get('/brands/:brandId/orders/:id/financials', requirePermission('view_financials'), getOrderFinancials);

// Users
router.get('/brands/:brandId/users', requirePermission('manage_users'), getUsers);
router.post('/brands/:brandId/users', requirePermission('manage_users'), createUser);

// Reports
router.post('/brands/:brandId/reports', requirePermission('submit_reports'), createReport);
router.patch('/brands/:brandId/reports/:id/approve', requirePermission('approve_reports'), approveReport);
```

### 3. Service Layer

```typescript
// All service functions should accept brandId
class ProductService {
  async getProducts(brandId: string, filters: any) {
    // Always filter by brandId
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('brand_id', brandId)
      .match(filters);
    
    return data;
  }
  
  async updateProduct(brandId: string, productId: string, updates: any) {
    // Verify product belongs to brand
    const { data } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('brand_id', brandId) // CRITICAL
      .single();
    
    return data;
  }
}
```

---

## 🎨 Frontend Changes Required

### 1. Brand Context

```typescript
// Create brand context
interface BrandContextType {
  currentBrand: Brand | null;
  userBrands: Brand[];
  switchBrand: (brandId: string) => void;
  userRole: string;
  hasPermission: (permission: string) => boolean;
}

export const BrandContext = createContext<BrandContextType>(null);

// Use in components
const { currentBrand, userRole, hasPermission } = useBrandContext();
```

### 2. Role-Based UI

```typescript
// Permission wrapper component
const PermissionGate: React.FC<{ permission: string; children: React.ReactNode }> = ({ 
  permission, 
  children 
}) => {
  const { hasPermission } = useBrandContext();
  
  if (!hasPermission(permission)) {
    return null;
  }
  
  return <>{children}</>;
};

// Usage
<PermissionGate permission="view_financials">
  <FinancialSummary />
</PermissionGate>

<PermissionGate permission="manage_users">
  <Button onClick={createUser}>Create User</Button>
</PermissionGate>
```

### 3. API Calls

```typescript
// All API calls should include brandId
const api = {
  products: {
    list: (brandId: string, filters: any) => 
      axios.get(`/api/brands/${brandId}/products`, { params: filters }),
    
    update: (brandId: string, productId: string, data: any) =>
      axios.patch(`/api/brands/${brandId}/products/${productId}`, data),
  },
  
  orders: {
    list: (brandId: string, filters: any) =>
      axios.get(`/api/brands/${brandId}/orders`, { params: filters }),
    
    getFinancials: (brandId: string, orderId: string) =>
      axios.get(`/api/brands/${brandId}/orders/${orderId}/financials`),
  },
};
```

### 4. Dashboard Components

```typescript
// Admin Dashboard (shows financials)
const AdminDashboard: React.FC = () => {
  const { currentBrand, hasPermission } = useBrandContext();
  
  return (
    <div>
      <RevenueCard />
      
      {hasPermission('view_financials') && (
        <>
          <CostsCard />
          <ProfitCard />
          <ProfitMarginChart />
        </>
      )}
      
      <OrdersCard />
      <InventoryCard />
    </div>
  );
};

// Manager Dashboard (no financials)
const ManagerDashboard: React.FC = () => {
  return (
    <div>
      <RevenueCard />
      <OrdersCard />
      <InventoryCard />
      <TeamPerformance />
    </div>
  );
};
```

---

## 📋 Step-by-Step Implementation Guide

### Phase 1: Database & RLS (Day 1-2)

1. Create `user_brand_access` table
2. Add `brand_id` to all tables
3. Migrate existing data (assign to default brand)
4. Create RLS policies for ALL tables
5. Test RLS policies thoroughly

### Phase 2: Backend Auth & Middleware (Day 3-4)

1. Create brand context middleware
2. Create permission checking middleware
3. Update all API routes to use middleware
4. Add brand verification to all endpoints
5. Test API with different roles

### Phase 3: Financial Management (Day 5-6)

1. Add cost fields to database
2. Create financial calculation functions
3. Create admin-only financial endpoints
4. Add role-based filtering
5. Test financial data visibility

### Phase 4: Frontend Context & UI (Day 7-9)

1. Create brand context provider
2. Create permission gate component
3. Update all API calls to include brandId
4. Implement role-based UI rendering
5. Create brand switcher (if needed)
6. Test UI with different roles

### Phase 5: Shopify Integration (Day 10-12)

1. Update OAuth to be brand-specific
2. Implement webhook handlers with brand identification
3. Implement bi-directional sync
4. Add sync error handling
5. Test sync thoroughly

### Phase 6: Reports System (Day 13-15)

1. Create reports table
2. Implement text reports
3. Implement voice recording + transcription
4. Implement image upload + OCR
5. Create approval workflow
6. Test reports system

### Phase 7: Testing & Polish (Day 16-18)

1. Write unit tests
2. Write integration tests
3. Test multi-tenant isolation
4. Test all roles
5. Fix bugs
6. Optimize performance

---

## ✅ Verification Checklist

After refactoring, verify:

### Security
- [ ] User A cannot see User B's brand data
- [ ] Manager cannot see admin-only financial data
- [ ] Staff cannot access admin features
- [ ] All API endpoints verify brand access
- [ ] All database queries include brand_id
- [ ] RLS policies work correctly

### Functionality
- [ ] Users can login and see their dashboard
- [ ] Admins can create users
- [ ] Shopify OAuth works per brand
- [ ] Products sync from Shopify
- [ ] Inventory updates sync to Shopify
- [ ] Orders sync from Shopify
- [ ] Financial data shows correctly (role-based)
- [ ] Reports can be submitted
- [ ] Notifications work

### UI/UX
- [ ] Role-based features show/hide correctly
- [ ] Financial data hidden from non-admins
- [ ] Brand context clear in UI
- [ ] Responsive design works
- [ ] Arabic RTL works
- [ ] No console errors

---

## 📚 Reference Documents

Read these files for complete specifications:

1. **SYSTEM_REQUIREMENTS_SPEC.md** - Complete system requirements
2. **docs/architecture.md** - Current architecture
3. **docs/api.md** - API documentation
4. **PRODUCTION_STATUS_REPORT.md** - Current status

---

## 🎯 Success Criteria

The refactoring is successful when:

1. ✅ Complete brand isolation (verified by tests)
2. ✅ Role-based access control working
3. ✅ Financial data visibility correct
4. ✅ Shopify integration working bi-directionally
5. ✅ Reports system functional
6. ✅ All tests passing
7. ✅ No security vulnerabilities
8. ✅ Performance acceptable
9. ✅ Code well-documented
10. ✅ Ready for production

---

## 💬 Questions to Ask

If anything is unclear, ask:

1. "Should super admin see all brands' data?"
2. "How should brand switching work in UI?"
3. "What happens when a user is removed from a brand?"
4. "Should we support user invitations?"
5. "What OCR/transcription APIs should we use?"
6. "How should sync conflicts be resolved?"
7. "What's the backup strategy?"

---

## 🚀 Let's Start!

Begin with Phase 1 (Database & RLS) and work through each phase systematically. Test thoroughly at each step before moving to the next phase.

**Remember**: Brand isolation is CRITICAL. Every query, every endpoint, every UI component must respect brand boundaries.

Good luck! 🎉
