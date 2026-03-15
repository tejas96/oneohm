import { Injectable, Logger } from '@nestjs/common';
import {
  SecurityEventType,
  SecurityEventCategory,
  SecurityEventSeverity,
  SecurityEventStatus,
} from '@oneohm-epc/shared/types';

import { SecurityEventEntity } from '../entities';
import { SecurityEventRepository } from '../repositories';

/**
 * Security Event Service
 * High-level service for logging and querying security events
 */
@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(private readonly repository: SecurityEventRepository) {}

  /**
   * Log a security event
   */
  async logEvent(data: {
    eventType: SecurityEventType;
    eventCategory: SecurityEventCategory;
    severity?: SecurityEventSeverity;
    status: SecurityEventStatus;
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    resourceId?: string;
    resourceType?: string;
    errorMessage?: string;
    expiresAt?: Date;
  }): Promise<SecurityEventEntity> {
    try {
      const event = await this.repository.create({
        ...data,
        severity: data.severity || this.inferSeverity(data.eventType, data.status),
      });

      // Log critical events
      if (event.severity === SecurityEventSeverity.CRITICAL) {
        this.logger.warn(
          `🔴 CRITICAL SECURITY EVENT: ${event.eventType} - User: ${event.userId}, IP: ${event.ipAddress}`,
        );
      }

      return event;
    } catch (error) {
      this.logger.error(`Failed to log security event: ${data.eventType}`, error);
      throw error;
    }
  }

  /**
   * Log OTP sent event
   */
  async logOtpSent(data: {
    phone: string;
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    expirySeconds: number;
  }): Promise<SecurityEventEntity> {
    return this.logEvent({
      eventType: SecurityEventType.OTP_SENT,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: SecurityEventStatus.SUCCESS,
      userId: data.userId,
      organizationId: data.organizationId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        phone: data.phone,
        expirySeconds: data.expirySeconds,
      },
      expiresAt: new Date(Date.now() + data.expirySeconds * 1000),
    });
  }

  /**
   * Log OTP verification
   */
  async logOtpVerification(data: {
    phone: string;
    userId?: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }): Promise<SecurityEventEntity> {
    return this.logEvent({
      eventType: data.success ? SecurityEventType.OTP_VERIFIED : SecurityEventType.OTP_FAILED,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: data.success ? SecurityEventStatus.SUCCESS : SecurityEventStatus.FAILED,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: { phone: data.phone },
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Log login attempt
   */
  async logLoginAttempt(data: {
    identifier: string; // phone or email
    userId?: string;
    success: boolean;
    method: 'otp' | 'password';
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }): Promise<SecurityEventEntity> {
    return this.logEvent({
      eventType: data.success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: data.success ? SecurityEventStatus.SUCCESS : SecurityEventStatus.FAILED,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: {
        identifier: data.identifier,
        method: data.method,
      },
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Log rate limit event
   */
  async logRateLimitExceeded(data: {
    eventType: SecurityEventType;
    userId?: string;
    ipAddress?: string;
    limit: number;
    window: string;
    currentCount: number;
  }): Promise<SecurityEventEntity> {
    return this.logEvent({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      eventCategory: SecurityEventCategory.RATE_LIMITING,
      severity: SecurityEventSeverity.WARNING,
      status: SecurityEventStatus.BLOCKED,
      userId: data.userId,
      ipAddress: data.ipAddress,
      metadata: {
        originalEventType: data.eventType,
        limit: data.limit,
        window: data.window,
        currentCount: data.currentCount,
      },
    });
  }

  /**
   * Log account blocked event
   */
  async logAccountBlocked(data: {
    userId?: string;
    ipAddress?: string;
    phone?: string;
    reason: string;
    blockDurationSeconds: number;
  }): Promise<SecurityEventEntity> {
    return this.logEvent({
      eventType: SecurityEventType.RATE_LIMIT_BLOCKED,
      eventCategory: SecurityEventCategory.RATE_LIMITING,
      severity: SecurityEventSeverity.CRITICAL,
      status: SecurityEventStatus.BLOCKED,
      userId: data.userId,
      ipAddress: data.ipAddress,
      metadata: {
        phone: data.phone,
        reason: data.reason,
        blockDurationSeconds: data.blockDurationSeconds,
      },
      expiresAt: new Date(Date.now() + data.blockDurationSeconds * 1000),
    });
  }

  /**
   * Check if user/IP is currently blocked
   */
  async isBlocked(userId?: string, ipAddress?: string): Promise<boolean> {
    return this.repository.isBlocked(userId, ipAddress);
  }

  /**
   * Count events for rate limiting
   */
  async countEvents(
    filter: {
      userId?: string;
      ipAddress?: string;
      eventType?: SecurityEventType;
      organizationId?: string;
    },
    timeWindowSeconds: number,
  ): Promise<number> {
    return this.repository.countEvents(filter, timeWindowSeconds);
  }

  /**
   * Get user's recent security activity
   */
  async getUserActivity(userId: string, limit = 20): Promise<SecurityEventEntity[]> {
    return this.repository.getUserRecentEvents(userId, limit);
  }

  /**
   * Get suspicious activities for an organization
   */
  async getSuspiciousActivities(
    organizationId: string,
    limit = 50,
  ): Promise<SecurityEventEntity[]> {
    return this.repository.getSuspiciousActivities(organizationId, limit);
  }

  /**
   * Clean up expired events (run as cron job)
   */
  async cleanupExpiredEvents(): Promise<number> {
    return this.repository.cleanupExpiredEvents();
  }

  /**
   * Infer severity based on event type and status
   */
  private inferSeverity(
    eventType: SecurityEventType,
    status: SecurityEventStatus,
  ): SecurityEventSeverity {
    // Critical events
    if (
      [
        SecurityEventType.ACCOUNT_LOCKED,
        SecurityEventType.ACCOUNT_SUSPENDED,
        SecurityEventType.BRUTE_FORCE_DETECTED,
        SecurityEventType.RATE_LIMIT_BLOCKED,
        SecurityEventType.UNAUTHORIZED_ACCESS,
      ].includes(eventType)
    ) {
      return SecurityEventSeverity.CRITICAL;
    }

    // Warnings
    if (
      [
        SecurityEventType.MULTIPLE_FAILED_ATTEMPTS,
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventType.SUSPICIOUS_LOGIN_LOCATION,
        SecurityEventType.PERMISSION_DENIED,
      ].includes(eventType)
    ) {
      return SecurityEventSeverity.WARNING;
    }

    // Errors (check for FAILED status)
    if (status === SecurityEventStatus.FAILED) {
      return SecurityEventSeverity.ERROR;
    }

    // Default to INFO
    return SecurityEventSeverity.INFO;
  }
}
