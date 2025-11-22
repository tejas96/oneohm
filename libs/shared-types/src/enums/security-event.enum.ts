/**
 * Security Event Types
 * Comprehensive list of security-related events in the system
 */
export enum SecurityEventType {
  // Authentication Events
  OTP_SENT = 'otp_sent',
  OTP_VERIFIED = 'otp_verified',
  OTP_FAILED = 'otp_failed',
  OTP_EXPIRED = 'otp_expired',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',

  // Password Events
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_RESET_FAILED = 'password_reset_failed',
  PASSWORD_CHANGED = 'password_changed',

  // Account Security Events
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_ACTIVATED = 'account_activated',
  PHONE_VERIFIED = 'phone_verified',
  EMAIL_VERIFIED = 'email_verified',

  // Authorization Events
  PERMISSION_DENIED = 'permission_denied',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',

  // Rate Limiting Events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  RATE_LIMIT_BLOCKED = 'rate_limit_blocked',

  // Suspicious Activity
  SUSPICIOUS_LOGIN_LOCATION = 'suspicious_login_location',
  SUSPICIOUS_LOGIN_DEVICE = 'suspicious_login_device',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',

  // Multi-Factor Authentication (Future)
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_VERIFIED = 'mfa_verified',
  MFA_FAILED = 'mfa_failed',

  // API Security
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  API_KEY_USED = 'api_key_used',

  // Session Events
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  SESSION_TERMINATED = 'session_terminated',

  // Audit Events
  SENSITIVE_DATA_ACCESSED = 'sensitive_data_accessed',
  SENSITIVE_DATA_MODIFIED = 'sensitive_data_modified',
  SENSITIVE_DATA_DELETED = 'sensitive_data_deleted',

  // Compliance Events
  GDPR_DATA_EXPORT = 'gdpr_data_export',
  GDPR_DATA_DELETION = 'gdpr_data_deletion',
  AUDIT_LOG_ACCESSED = 'audit_log_accessed',
}

/**
 * Security Event Categories
 * High-level categorization for filtering and analytics
 */
export enum SecurityEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  ACCOUNT_MANAGEMENT = 'account_management',
  RATE_LIMITING = 'rate_limiting',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  AUDIT = 'audit',
  COMPLIANCE = 'compliance',
  SESSION_MANAGEMENT = 'session_management',
}

/**
 * Security Event Severity
 * Indicates the importance/risk level of the event
 */
export enum SecurityEventSeverity {
  INFO = 'info', // Normal operations
  WARNING = 'warning', // Potential issues
  ERROR = 'error', // Failed operations
  CRITICAL = 'critical', // Security threats
}

/**
 * Security Event Status
 * Indicates the outcome of the event
 */
export enum SecurityEventStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}
