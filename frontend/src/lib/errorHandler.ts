/**
 * Error handling utilities for Frontend
 */

export class ApiError extends Error {
  statusCode: number;
  errors?: { field: string; message: string }[];

  constructor(message: string, statusCode: number = 500, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
  }
}

export function handleApiError(error: any): {
  message: string;
  statusCode: number;
} {
  // Axios error
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.error || data?.message || "خطأ في الخادم";
    return { message, statusCode: status };
  }

  // Network error
  if (error.request && !error.response) {
    return {
      message: "خطأ في الاتصال. تحقق من شبكتك.",
      statusCode: 0,
    };
  }

  // Other errors
  return {
    message: error.message || "حدث خطأ غير متوقع",
    statusCode: 500,
  };
}

export function getErrorMessage(error: any): string {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  if (error?.response?.data?.error) return error.response.data.error;
  return "حدث خطأ غير متوقع";
}

export function getErrorStatusCode(error: any): number {
  return error?.response?.status || error?.statusCode || 500;
}

export function isAuthError(error: any): boolean {
  const status = getErrorStatusCode(error);
  return status === 401 || status === 403;
}

export function isNetworkError(error: any): boolean {
  return !error.response && error.request;
}

export function isValidationError(error: any): boolean {
  return getErrorStatusCode(error) === 400;
}
