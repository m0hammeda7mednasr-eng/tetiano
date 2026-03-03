/**
 * TypeScript interfaces and types
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "operator" | "viewer";
  is_active: boolean;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: "admin" | "manager" | "operator" | "viewer";
  user?: User;
  team?: Team;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  shopify_domain: string;
  shopify_location_id: string;
  access_token?: string;
  shopify_scopes?: string;
  connected_at?: string;
  is_active: boolean;
  last_sync_at?: string;
  api_key?: string;
  api_secret?: string;
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  brand_id: string;
  shopify_product_id: string;
  title: string;
  handle?: string;
  product_type?: string;
  vendor?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface Variant {
  id: string;
  product_id: string;
  brand_id: string;
  shopify_variant_id: string;
  title?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  compare_at_price?: number;
  position?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryLevel {
  id: string;
  variant_id: string;
  brand_id: string;
  available: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  variant_id: string;
  brand_id: string;
  delta: number;
  source: "webhook" | "manual" | "order" | "refund" | "sync";
  reason?: string;
  reference_id?: string;
  user_id?: string;
  timestamp: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  user_id: string;
  team_id: string;
  brand_id?: string;
  done_today: string;
  plan_tomorrow: string;
  blockers?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  event_hash: string;
  topic: string;
  shop: string;
  payload: Record<string, any>;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: { field: string; message: string }[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}
