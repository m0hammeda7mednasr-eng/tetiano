/**
 * Frontend constants and utilities
 */

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  OPERATOR: "operator",
  VIEWER: "viewer",
};

export const ROLE_LABELS = {
  admin: "مسؤول",
  manager: "مدير",
  operator: "مشغل",
  viewer: "عارض",
};

export const STOCK_STATUS = {
  OUT_OF_STOCK: {
    label: "نفذ",
    color: "red",
    bg: "bg-red-50",
    badge: "badge-red",
  },
  LOW_STOCK: {
    label: "منخفض",
    color: "amber",
    bg: "bg-amber-50",
    badge: "badge-yellow",
  },
  IN_STOCK: {
    label: "متوفر",
    color: "green",
    bg: "bg-green-50",
    badge: "badge-green",
  },
};

export const BRAND_COLORS = {
  tetiano: "indigo",
  "98": "blue",
};

export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
};

export const API_ENDPOINTS = {
  AUTH: {
    SIGNIN: "/auth/signin",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
  },
  INVENTORY: {
    LIST: "/api/app/products",
    GET: (id: string) => `/api/app/products/${id}`,
    ADJUST: (id: string) => `/api/app/variants/${id}/stock`,
    MOVEMENTS: (id: string) => `/api/app/variants/${id}/movements`,
  },
  REPORTS: {
    LIST: "/api/app/reports",
    CREATE: "/api/app/reports",
    GET: (id: string) => `/api/app/reports/${id}`,
  },
  USERS: {
    LIST: "/api/app/users",
    CREATE: "/api/app/users",
    UPDATE_ROLE: (id: string) => `/api/app/users/${id}/role`,
    UPDATE_STATUS: (id: string) => `/api/app/users/${id}/status`,
  },
  SHOPIFY: {
    AUTH: "/api/app/shopify/connect",
    CALLBACK: "/api/shopify/callback",
    STATUS: "/api/app/shopify/status",
    DISCONNECT: "/api/app/shopify/disconnect",
  },
};

export const TOAST_DURATION = 5000; // ms

export const MODAL_ANIMATIONS = {
  FADE_IN: "anim-fade-up",
  BOUNCE: "anim-bounce",
};

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 8,
  MIN_USERNAME_LENGTH: 2,
  MAX_USERNAME_LENGTH: 50,
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: "خطأ في الشبكة. تحقق من الاتصال.",
  SERVER_ERROR: "خطأ في الخادم. حاول لاحقاً.",
  UNAUTHORIZED: "غير مصادق. سجل دخول من جديد.",
  PERMISSION_DENIED: "ليس لديك صلاحية.",
  NOT_FOUND: "المورد غير موجود.",
  VALIDATION_ERROR: "خطأ في البيانات المدخلة.",
};

export const SUCCESS_MESSAGES = {
  SAVED: "تم الحفظ بنجاح.",
  CREATED: "تم الإنشاء بنجاح.",
  UPDATED: "تم التحديث بنجاح.",
  DELETED: "تم الحذف بنجاح.",
  COPIED: "تم النسخ إلى الحافظة.",
};

/**
 * Get stock status based on quantity
 */
export function getStockStatus(quantity: number): {
  label: string;
  color: string;
  bg: string;
  badge: string;
} {
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity < 10) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}

/**
 * Format currency (Egyptian Pound)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("ar-EG");
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number = 50): string {
  return text.length > length ? text.substring(0, length) + "..." : text;
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Generate random avatar color
 */
export function randomAvatarColor(): string {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-yellow-100 text-yellow-700",
    "bg-cyan-100 text-cyan-700",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
