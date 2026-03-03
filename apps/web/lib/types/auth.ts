/**
 * Auth Types - OneOhm EPC
 * Types for authentication requests and responses
 * Matches backend DTOs
 */

/**
 * Profile summary (matches backend ProfileSummaryDto)
 */
export interface ProfileSummary {
  type: 'customer' | 'reseller' | 'employee';
  profileId: string;
  organizationId: string;
  organizationName: string;
  isPrimary: boolean;
  status: string;
  avatarUrl?: string;
  designation?: string;
  department?: string;
  businessName?: string;
}

/**
 * User interface matching backend LoginUserDto
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  phone: string;
  roles: string[];
  permissions: string[];
  profiles: ProfileSummary[];
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  organizationId?: string;
}

// ============================================
// Request Types
// ============================================

/**
 * Login credentials for email/password authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * OTP request data
 */
export interface OtpRequestData {
  phone: string;
}

/**
 * OTP verification data
 */
export interface OtpVerifyData {
  phone: string;
  otp: string;
}

/**
 * Forgot password request
 */
export interface ForgotPasswordData {
  email: string;
}

/**
 * Reset password request
 */
export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// ============================================
// Response Types
// ============================================

/**
 * Auth user response (matches backend LoginUserDto)
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone: string;
  roles: string[];
  permissions: string[];
  profiles: ProfileSummary[];
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  fullName: string;
}

/**
 * Login response (matches backend LoginResponseDto)
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * OTP request response
 */
export interface OtpRequestResponse {
  message: string;
  retryAfter?: number;
}

/**
 * Password reset response
 */
export interface PasswordResetResponse {
  message: string;
}

// ============================================
// Error Types
// ============================================

/**
 * Auth error response structure
 */
export interface AuthError {
  message: string;
  statusCode?: number;
  error?: string;
}
