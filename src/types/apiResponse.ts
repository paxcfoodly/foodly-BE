export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function successResponse<T>(data: T, pagination?: PaginationMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    ...(pagination && { pagination }),
  };
}

export function errorResponse(message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: message,
  };
}
