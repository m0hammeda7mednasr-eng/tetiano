/**
 * Shared backend domain types (store-per-tenant).
 * Tenant identifier is always store_id.
 */

export type StoreRole = "admin" | "manager" | "staff" | "viewer";

export interface Store {
  id: string;
  name: string;
  slug: string;
  admin_user_id?: string | null;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: StoreRole | "owner" | "operator" | "user";
  store_id: string | null;
  is_active: boolean;
  avatar_color: string;
  permissions?: string[] | Record<string, boolean> | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoreMembership {
  id: string;
  store_id: string;
  user_id: string;
  store_role: StoreRole;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface ShopifyConnection {
  id: string;
  store_id: string;
  shop_domain: string;
  scopes?: string | null;
  connected_at?: string | null;
  status: "connected" | "disconnected" | "error";
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  brand_id?: string | null; // one-release compatibility field
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
  store_id: string;
  brand_id?: string | null; // one-release compatibility field
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
  store_id: string;
  brand_id?: string | null; // one-release compatibility field
  available: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  variant_id: string;
  store_id: string;
  brand_id?: string | null; // one-release compatibility field
  delta: number;
  source: "webhook" | "manual" | "order" | "refund" | "sync";
  reason?: string;
  reference_id?: string;
  user_id?: string;
  timestamp: string;
  created_at: string;
}

export interface Report {
  id: string;
  store_id: string;
  author_user_id: string;
  report_date: string;
  body_text: string;
  status: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface ReportAttachment {
  id: string;
  store_id: string;
  report_id: string;
  file_type: "image" | "audio" | "file";
  mime_type: string;
  size: number;
  storage_key: string;
  uploaded_by: string;
  created_at: string;
}

export interface ReportComment {
  id: string;
  store_id: string;
  report_id: string;
  author_user_id: string;
  comment_text: string;
  created_at: string;
}

export interface Notification {
  id: string;
  store_id: string;
  user_id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
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

