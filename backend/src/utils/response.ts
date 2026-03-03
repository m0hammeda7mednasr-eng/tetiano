/**
 * Standardized API Response Format
 */

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  message?: string;
  error?: string;
  errors?: { field: string; message: string }[];
  timestamp: string;
  path?: string;
  user?: string;
}

export class ApiResponseFormatter {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      statusCode: 200,
      data,
      message: message || "تم بنجاح",
      timestamp: new Date().toISOString(),
    };
  }

  static created<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      statusCode: 201,
      data,
      message: message || "تم الإنشاء بنجاح",
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    message: string,
    statusCode: number = 500,
    errors?: { field: string; message: string }[],
  ): ApiResponse {
    return {
      success: false,
      statusCode,
      error: message,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  static badRequest(
    message: string,
    errors?: { field: string; message: string }[],
  ): ApiResponse {
    return this.error(message, 400, errors);
  }

  static unauthorized(message: string = "غير مصادق"): ApiResponse {
    return this.error(message, 401);
  }

  static forbidden(message: string = "ليس لديك صلاحية"): ApiResponse {
    return this.error(message, 403);
  }

  static notFound(message: string = "المورد غير موجود"): ApiResponse {
    return this.error(message, 404);
  }

  static serverError(message: string = "خطأ في الخادم"): ApiResponse {
    return this.error(message, 500);
  }
}

export const formatResponse = ApiResponseFormatter;
