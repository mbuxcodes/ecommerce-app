export const USER_ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
};

export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const COOKIE_OPTIONS = {
  httpOnly: true,             // JS cannot access this cookie (XSS protection)
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "strict",         // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 100,
};