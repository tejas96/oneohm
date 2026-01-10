import { SetMetadata } from '@nestjs/common';
import type { SecurityEventType } from '@oneohm-epc/shared-types';

/**
 * Security Rate Limit Configuration
 */
export interface SecurityRateLimitConfig {
  /**
   * Event type to track in security_events table
   */
  eventType: SecurityEventType;

  /**
   * Rate limit rules (can have multiple windows)
   * Example: [{ count: 1, windowSeconds: 60 }, { count: 5, windowSeconds: 86400 }]
   */
  limits: Array<{
    count: number;
    windowSeconds: number;
    message?: string;
  }>;

  /**
   * Fields to track rate limits by
   * @default ['ipAddress']
   * Examples:
   * - ['phone'] - Rate limit by phone number
   * - ['email'] - Rate limit by email
   * - ['ipAddress'] - Rate limit by IP
   * - ['userId'] - Rate limit by user ID
   * - ['phone', 'ipAddress'] - Rate limit by phone AND IP (both must match)
   */
  trackBy?: Array<'phone' | 'email' | 'ipAddress' | 'userId'>;

  /**
   * Block user/IP after limit exceeded
   * @default false
   */
  blockOnExceed?: boolean;

  /**
   * Block duration in seconds
   * @default 86400 (24 hours)
   */
  blockDurationSeconds?: number;
}

export const SECURITY_RATE_LIMIT_KEY = 'security_rate_limit';

/**
 * Security Rate Limit Decorator
 * Uses security_events table for persistent, auditable rate limiting
 *
 * Features:
 * - Persistent across server restarts (PostgreSQL-based)
 * - Multiple time windows (cooldown + daily limit)
 * - Full audit trail for compliance
 * - Flexible tracking (phone, email, IP, userId)
 *
 * @example
 * // OTP rate limiting: 1 per minute, 5 per day
 * @SecurityRateLimit({
 *   eventType: SecurityEventType.OTP_SENT,
 *   trackBy: ['phone', 'ipAddress'],
 *   limits: [
 *     { count: 1, windowSeconds: 60, message: 'Wait 60s between OTP requests' },
 *     { count: 5, windowSeconds: 86400, message: 'Max 5 OTPs per day' }
 *   ],
 *   blockOnExceed: true
 * })
 * @Post('otp/request')
 * async requestOtp() { ... }
 *
 * @example
 * // Login attempt rate limiting
 * @SecurityRateLimit({
 *   eventType: SecurityEventType.LOGIN_ATTEMPT,
 *   trackBy: ['email', 'ipAddress'],
 *   limits: [
 *     { count: 5, windowSeconds: 300, message: 'Max 5 login attempts per 5 minutes' }
 *   ]
 * })
 * @Post('login')
 * async login() { ... }
 */
export const SecurityRateLimit = (config: SecurityRateLimitConfig): MethodDecorator =>
  SetMetadata(SECURITY_RATE_LIMIT_KEY, config);
