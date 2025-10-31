// Common TypeScript types shared across all applications

/**
 * Base API Response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * User roles
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * Base User type
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Authentication types
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
  phone?: string;
}

/**
 * Theme types
 */
export type ThemeMode = 'light' | 'dark';

/**
 * API Error type
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Add more shared types as needed
