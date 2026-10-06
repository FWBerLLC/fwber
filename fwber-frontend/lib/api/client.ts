/**
 * Shared API client utilities
 * This module provides a centralized way to make authenticated API calls.
 * Uses TypeScript types from ./types.ts for full type safety.
 */

import type {
  ApiResponse,
  ApiErrorResponse,
  ValidationError,
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
} from './types';

// Ensure BASE_URL hits the backend API directly
const getBaseUrl = () => {
  // If window is defined, we are definitely in the browser.
  // ALWAYS use relative path to route through the Next.js proxy.
  if (typeof window !== 'undefined') {
    return '/api';
  }
  
  // On the server (SSR), use the absolute URL.
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const url = envUrl || 'https://api.fwber.site';
  
  // Ensure we don't return just '/api' if NEXT_PUBLIC_API_URL is somehow empty on server
  const normalizedUrl = url.replace(/\/$/, '');
  return normalizedUrl.includes('://') ? `${normalizedUrl}/api` : '/api';
};

const BASE_URL = getBaseUrl();
let currentAuthToken: string | null = null;

export function setApiClientAuthToken(token: string | null): void {
  currentAuthToken = token;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  body?: any; // Allow any body (string, FormData, etc.)
  retry?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries in ms
}

/**
 * Custom API Error class with detailed information
 * Extends the ApiErrorResponse type for consistency
 */
export class ApiError extends Error implements ApiErrorResponse {
  public readonly timestamp: string;
  public readonly errors?: ValidationError[];
  public readonly code?: string;

  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.timestamp = new Date().toISOString();

    // Extract validation errors if present
    if (data?.errors && Array.isArray(data.errors)) {
      this.errors = data.errors;
    }

    // Extract error code if present
    if (data?.code) {
      this.code = data.code;
    }
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422 && !!this.errors;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
  
  get isRateLimitError(): boolean {
    return this.status === 429;
  }

  /**
   * Get validation errors by field name
   */
  getFieldErrors(field: string): string[] {
    if (!this.errors) return [];
    return this.errors
      .filter(e => e.field === field)
      .map(e => e.message);
  }

  /**
   * Get all validation error messages
   */
  getAllErrorMessages(): string[] {
    if (!this.errors) return [this.message];
    return this.errors.map(e => e.message);
  }

  /**
   * Convert to ApiErrorResponse format
   */
  toErrorResponse(): ApiErrorResponse {
    return {
      message: this.message,
      status: this.status,
      timestamp: this.timestamp,
      errors: this.errors,
      code: this.code,
    };
  }
}

/**
 * Specific error for Rate Limits (429)
 */
export class RateLimitError extends ApiError {
  constructor(message: string, data?: any) {
    super(message || 'Too many requests. Please try again later.', 429, 'Too Many Requests', data);
    this.name = 'RateLimitError';
  }
}

/**
 * Network error for when fetch itself fails
 */
export class NetworkError extends Error {
  constructor(message: string = 'Network request failed. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Get authorization headers from localStorage
 */
function getAuthHeaders(): Record<string, string> {
  const token = currentAuthToken ?? (typeof window !== 'undefined' ? localStorage.getItem('fwber_token') : null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Delay helper for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an authenticated API request with retry logic
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data: T; status: number }> {
  const {
    params,
    headers,
    retry = 0,
    retryDelay = 1000,
    body,
    ...fetchOptions
  } = options;

  // Build URL with query parameters - Dynamically get base URL
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Determine Content-Type
  // If body is FormData, let the browser set Content-Type (multipart/form-data with boundary)
  // Otherwise default to application/json
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...getAuthHeaders(),
  };

  if (!isFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Merge headers
  const finalHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...(headers as Record<string, string>),
  };
  const hadAuthHeader = Boolean(finalHeaders.Authorization);

  let lastError: Error | null = null;
  const maxAttempts = retry + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Make request
      const response = await fetch(url, {
        ...fetchOptions,
        headers: finalHeaders,
        body: isFormData ? body : (typeof body === 'object' ? JSON.stringify(body) : body),
      });

      // Parse response - handle empty responses
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
        
        let apiError: ApiError;
        
        if (response.status === 429) {
          apiError = new RateLimitError(errorMessage, data);
        } else {
          apiError = new ApiError(
            errorMessage,
            response.status,
            response.statusText,
            data
          );
        }

        // Don't retry client errors (except 429 rate limit) or auth errors
        if ((apiError.isClientError && !apiError.isRateLimitError) || apiError.isAuthError) {
          // If auth error in browser, clear storage and redirect
          if (apiError.isAuthError && typeof window !== 'undefined' && hadAuthHeader) {
            setApiClientAuthToken(null);
            localStorage.removeItem('fwber_token');
            localStorage.removeItem('fwber_user');
            // Check if we are already on login page to avoid redirect loops
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login?reason=session_expired';
            }
          }
          throw apiError;
        }

        // For server errors or rate limits, retry
        lastError = apiError;
        if (attempt < maxAttempts - 1) {
          await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }
        throw apiError;
      }

      return { data, status: response.status };

    } catch (error) {
      // Network errors (fetch failed)
      if (error instanceof TypeError || (error instanceof Error && error.message === 'Failed to fetch')) {
        const networkError = new NetworkError();
        lastError = networkError;

        // Retry network errors
        if (attempt < maxAttempts - 1) {
          await delay(retryDelay * Math.pow(2, attempt));
          continue;
        }
        throw networkError;
      }

      // Re-throw ApiError and other errors
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Request failed after all retries');
}

/**
 * API client with common HTTP methods
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET', retry: options?.retry ?? 2 }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body,
      retry: options?.retry ?? 1, // POST requests get 1 retry by default
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body,
      retry: options?.retry ?? 1,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body,
      retry: options?.retry ?? 1,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE', retry: options?.retry ?? 0 }),
};

/**
 * Check if error is a specific type of API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Get user-friendly error message from error
 */
export function getErrorMessage(error: unknown): string {
  if (isRateLimitError(error)) {
    return "You're doing that too fast. Please wait a moment.";
  }
  if (isApiError(error)) {
    return error.message;
  }
  if (isNetworkError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if error has validation errors
 */
export function hasValidationErrors(error: unknown): error is ApiError {
  return isApiError(error) && error.isValidationError;
}

/**
 * Extract validation errors from error
 */
export function getValidationErrors(error: unknown): ValidationError[] {
  if (hasValidationErrors(error)) {
    return error.errors || [];
  }
  return [];
}

/**
 * Get validation errors for a specific field
 */
export function getFieldValidationErrors(error: unknown, field: string): string[] {
  if (hasValidationErrors(error)) {
    return error.getFieldErrors(field);
  }
  return [];
}

// ======
// Typed API Client Wrappers
// ======

/**
 * Typed wrapper around apiClient.get that unwraps the data property
 * Usage: const user = await api.get<User>('/users/1')
 */
export const api = {
  /**
   * GET request that returns unwrapped data
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await apiClient.get<T>(endpoint, options);
    return response.data;
  },

  /**
   * POST request that returns unwrapped data
   */
  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    const response = await apiClient.post<T>(endpoint, body, options);
    return response.data;
  },

  /**
   * PUT request that returns unwrapped data
   */
  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    const response = await apiClient.put<T>(endpoint, body, options);
    return response.data;
  },

  /**
   * PATCH request that returns unwrapped data
   */
  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    const response = await apiClient.patch<T>(endpoint, body, options);
    return response.data;
  },

  /**
   * DELETE request that returns unwrapped data
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await apiClient.delete<T>(endpoint, options);
    return response.data;
  },
};

/**
 * Helper to handle paginated responses
 * Extracts the data array and pagination metadata
 */
export async function getPaginated<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<PaginatedResponse<T>> {
  return api.get<PaginatedResponse<T>>(endpoint, options);
}

/**
 * Helper to handle API responses wrapped in success/error format
 * Automatically unwraps SuccessResponse or throws error from ErrorResponse
 */
export async function getApiResponse<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const response = await api.get<ApiResponse<T>>(endpoint, options);

  if (response.success) {
    return response.data;
  } else {
    throw new ApiError(
      response.error.message,
      response.error.status,
      '',
      response.error
    );
  }
}

// ======
// Utility Functions for Common API Patterns
// ======

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  return searchParams.toString();
}

/**
 * Helper to upload files with FormData
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }

  // Use api.post which now handles FormData correctly
  return api.post<T>(endpoint, formData);
}

/**
 * Helper to handle optimistic updates with automatic retry on failure
 */
export async function optimisticUpdate<T>(
  updateFn: () => Promise<T>,
  rollbackFn: () => void,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  }
): Promise<T> {
  const { maxRetries = 2, retryDelay = 1000 } = options || {};

  try {
    return await updateFn();
  } catch (error) {
    // Rollback optimistic update
    rollbackFn();

    // Retry if network error
    if (isNetworkError(error) && maxRetries > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return optimisticUpdate(updateFn, rollbackFn, {
        maxRetries: maxRetries - 1,
        retryDelay: retryDelay * 2,
      });
    }

    throw error;
  }
}
