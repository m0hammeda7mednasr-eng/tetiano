/**
 * Application Constants and Enums
 */

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  OPERATOR = "operator",
  VIEWER = "viewer",
}

export enum TeamRole {
  ADMIN = "admin",
  MANAGER = "manager",
  OPERATOR = "operator",
  VIEWER = "viewer",
}

export enum StockMovementType {
  WEBHOOK = "webhook",
  MANUAL = "manual",
  ORDER = "order",
  REFUND = "refund",
  SYNC = "sync",
}

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum ShopifyWebhookTopic {
  INVENTORY_LEVELS_UPDATE = "inventory_levels/update",
  ORDERS_CREATE = "orders/create",
  ORDERS_UPDATED = "orders/updated",
  ORDERS_PAID = "orders/paid",
  ORDERS_CANCELLED = "orders/cancelled",
  REFUNDS_CREATE = "refunds/create",
  PRODUCTS_CREATE = "products/create",
  PRODUCTS_UPDATE = "products/update",
  PRODUCTS_DELETE = "products/delete",
  CUSTOMERS_CREATE = "customers/create",
  CUSTOMERS_UPDATE = "customers/update",
  CUSTOMERS_DELETE = "customers/delete",
}

export const SHOPIFY_SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_orders",
  "read_customers",
  "read_locations",
].join(",");

export const ROLES_HIERARCHY = {
  [UserRole.ADMIN]: 4,
  [UserRole.MANAGER]: 3,
  [UserRole.OPERATOR]: 2,
  [UserRole.VIEWER]: 1,
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    "can_view_inventory",
    "can_adjust_inventory",
    "can_view_orders",
    "can_submit_reports",
    "can_manage_users",
    "can_manage_teams",
    "can_manage_brands",
    "can_view_audit_log",
  ],
  [UserRole.MANAGER]: [
    "can_view_inventory",
    "can_adjust_inventory",
    "can_view_orders",
    "can_submit_reports",
    "can_manage_team",
    "can_view_audit_log",
  ],
  [UserRole.OPERATOR]: [
    "can_view_inventory",
    "can_adjust_inventory",
    "can_view_orders",
    "can_submit_reports",
  ],
  [UserRole.VIEWER]: ["can_view_inventory", "can_view_orders"],
};

export const TIMEZONE = "Africa/Cairo";

export const REPORT_REMINDER_HOUR = 18; // 6 PM
export const REPORT_REMINDER_MINUTE = 0;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
};

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SKU_MIN_LENGTH: 2,
  SKU_MAX_LENGTH: 255,
  PRODUCT_NAME_MIN_LENGTH: 2,
  PRODUCT_NAME_MAX_LENGTH: 500,
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "غير مصادق. يرجى تسجيل الدخول.",
  FORBIDDEN: "ليس لديك صلاحية للوصول إلى هذا المورد.",
  NOT_FOUND: "المورد غير موجود.",
  BAD_REQUEST: "طلب غير صالح.",
  SERVER_ERROR: "حدث خطأ في الخادم. يرجى المحاولة لاحقاً.",
  INVALID_TOKEN: "التوكن غير صالح أو منتهي الصلاحية.",
  RATE_LIMIT: "طلبات كثيرة جداً. حاول لاحقاً.",
};

export const SUCCESS_MESSAGES = {
  CREATED: "تم الإنشاء بنجاح.",
  UPDATED: "تم التحديث بنجاح.",
  DELETED: "تم الحذف بنجاح.",
  SUCCESS: "تم بنجاح.",
};
