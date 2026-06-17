import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityEventType } from '@tejas96/shared/types';
import type { Request } from 'express';

import { SECURITY_RATE_LIMIT_KEY, type SecurityRateLimitConfig } from '../../../common/decorators';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { SecurityEventService } from '../services/security-event.service';

/**
 * Security Rate Limit Guard
 * Enforces rate limits using security_events table
 *
 * Features:
 * - Persistent rate limiting (survives server restarts)
 * - Multiple time windows per endpoint
 * - Full audit trail
 * - Flexible tracking (phone, email, IP, userId)
 *
 * Usage:
 * @UseGuards(SecurityRateLimitGuard)
 * @SecurityRateLimit({ ... })
 */
@Injectable()
export class SecurityRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(SecurityRateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private securityEventRepository: SecurityEventRepository,
    private securityEventService: SecurityEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get rate limit config from decorator
    const config = this.reflector.getAllAndOverride<SecurityRateLimitConfig>(
      SECURITY_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no rate limit configured, allow
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const trackingData = this.extractTrackingData(request, config.trackBy || ['ipAddress']);

    // Check if user/IP is blocked
    let isBlocked: boolean;
    try {
      isBlocked = await this.checkIfBlocked(trackingData);
    } catch (error) {
      // Fail open on transient DB errors (e.g. connection terminated) so a
      // brief Postgres hiccup does not lock all users out of login.
      this.logger.error('Failed to check block status, allowing request through', error);
      return true;
    }

    if (isBlocked) {
      throw new BadRequestException(
        'Access temporarily blocked due to excessive requests. Please try again later.',
      );
    }

    // Check each rate limit window
    for (const limit of config.limits) {
      try {
        await this.checkRateLimit(config.eventType, trackingData, limit, request);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        // Fail open on transient DB errors for rate-limit counting as well
        this.logger.error('Failed to check rate limit, allowing request through', error);
      }
    }

    return true;
  }

  /**
   * Extract tracking data from request based on trackBy fields
   */
  private extractTrackingData(
    request: Request,
    trackBy: Array<'phone' | 'email' | 'ipAddress' | 'userId'>,
  ): Record<string, string | undefined> {
    const data: Record<string, string | undefined> = {};

    for (const field of trackBy) {
      switch (field) {
        case 'phone':
          data.phone = request.body?.phone;
          break;
        case 'email':
          data.email = request.body?.email;
          break;
        case 'ipAddress':
          data.ipAddress = request.ip || request.socket.remoteAddress;
          break;
        case 'userId':
          data.userId = (request.user as { id?: string } | undefined)?.id;
          break;
      }
    }

    return data;
  }

  /**
   * Check if user/IP is currently blocked
   */
  private async checkIfBlocked(trackingData: Record<string, string | undefined>): Promise<boolean> {
    return this.securityEventRepository.isBlocked(trackingData.userId, trackingData.ipAddress);
  }

  /**
   * Check rate limit for a specific time window
   */
  private async checkRateLimit(
    eventType: SecurityEventType,
    trackingData: Record<string, string | undefined>,
    limit: { count: number; windowSeconds: number; message?: string },
    _request: Request,
  ): Promise<void> {
    // Build metadata query for tracking fields
    const metadata: Record<string, string> = {};
    if (trackingData.phone) metadata.phone = trackingData.phone;
    if (trackingData.email) metadata.email = trackingData.email;

    // Count recent events
    const query = this.securityEventRepository.repository
      .createQueryBuilder('event')
      .where('event.eventType = :eventType', { eventType })
      .andWhere('event.createdAt >= :since', {
        since: new Date(Date.now() - limit.windowSeconds * 1000),
      });

    // Add metadata filters
    if (Object.keys(metadata).length > 0) {
      query.andWhere('event.metadata @> :metadata', { metadata });
    }

    // Add IP filter if tracking by IP
    if (trackingData.ipAddress) {
      query.andWhere('event.ipAddress = :ipAddress', { ipAddress: trackingData.ipAddress });
    }

    // Add user filter if tracking by userId
    if (trackingData.userId) {
      query.andWhere('event.userId = :userId', { userId: trackingData.userId });
    }

    const count = await query.getCount();

    if (count >= limit.count) {
      // Log rate limit exceeded
      await this.securityEventService.logRateLimitExceeded({
        eventType,
        userId: trackingData.userId,
        ipAddress: trackingData.ipAddress,
        limit: limit.count,
        window: `${limit.windowSeconds}s`,
        currentCount: count + 1,
      });

      const defaultMessage = `Rate limit exceeded. Maximum ${limit.count} requests per ${limit.windowSeconds} seconds.`;
      throw new BadRequestException(limit.message || defaultMessage);
    }

    this.logger.debug(
      `Rate limit check passed: ${count}/${limit.count} requests in ${limit.windowSeconds}s window`,
    );
  }
}
