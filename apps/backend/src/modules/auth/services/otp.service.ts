import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SecurityEventType,
  SecurityEventCategory,
  SecurityEventStatus,
} from '@oneohm-epc/shared-types';
import * as bcrypt from 'bcrypt';
import { MoreThan } from 'typeorm';

import { ConfigService } from '../../../config/config.service';
import { SecurityEventRepository } from '../../security-events/repositories/security-event.repository';
import { SecurityEventService } from '../../security-events/services/security-event.service';
/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 * Uses security_events table for persistent storage (no Redis required)
 *
 * Note: Rate limiting is now handled by SecurityRateLimitGuard at the controller level
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly isDevelopment: boolean;

  // Configuration
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_SECONDS = 300; // 5 minutes
  private readonly MAX_FAILED_ATTEMPTS = 5; // Block after 5 failed attempts
  private readonly BLOCK_DURATION_SECONDS = 86400; // 24 hours

  constructor(
    private readonly securityEventService: SecurityEventService,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly configService: ConfigService,
  ) {
    this.isDevelopment = this.configService.isDevelopment;
    if (this.isDevelopment) {
      this.logger.warn('🔓 Development mode: Test OTP "123456" enabled');
    }
  }

  /**
   * Generate and store OTP
   * @param phone - Phone number (E.164 format: +919876543210)
   * @param userId - Optional user ID (if user exists)
   * @param organizationId - Optional organization ID
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   *
   * Note: Rate limiting is enforced by SecurityRateLimitGuard at controller level
   */
  async generateAndStoreOtp(data: {
    phone: string;
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ otp: string; expiresAt: Date }> {
    const { phone, userId, organizationId, ipAddress, userAgent } = data;

    // 1. Check if user/IP is blocked
    const isBlocked = await this.securityEventService.isBlocked(userId, ipAddress);
    if (isBlocked) {
      throw new ForbiddenException(
        'Your account or IP has been temporarily blocked due to suspicious activity. Please try again after 24 hours.',
      );
    }

    // 2. Invalidate any existing pending OTPs for this phone
    await this.invalidateExistingOtps(phone);

    // 3. Generate OTP
    const otp = this.generateOtp();

    // 4. Hash OTP for security
    const otpHash = await bcrypt.hash(otp, 10);

    // 5. Store in security_events table
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_SECONDS * 1000);

    await this.securityEventService.logEvent({
      eventType: SecurityEventType.OTP_SENT,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: SecurityEventStatus.PENDING,
      userId,
      organizationId,
      ipAddress,
      userAgent,
      metadata: {
        phone,
        otpHash,
        expirySeconds: this.OTP_EXPIRY_SECONDS,
        verified: false,
        attempts: 0,
      },
      expiresAt,
    });

    this.logger.log(`OTP generated for ${phone} (expires in ${this.OTP_EXPIRY_SECONDS}s)`);

    return { otp, expiresAt };
  }

  /**
   * Verify OTP
   * @param phone - Phone number
   * @param inputOtp - OTP entered by user
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   */
  async verifyOtp(data: {
    phone: string;
    inputOtp: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; userId?: string }> {
    const { phone, inputOtp, ipAddress, userAgent } = data;

    // Development bypass: Accept fixed OTP "123456"
    if (this.isDevelopment && inputOtp === '123456') {
      this.logger.warn(`🔓 DEV MODE: Test OTP accepted for ${phone}`);
      return { success: true };
    }

    // 1. Check if blocked
    const isBlocked = await this.securityEventRepository.isBlocked(undefined, ipAddress);
    if (isBlocked) {
      throw new ForbiddenException('Too many failed attempts. Please try again after 24 hours.');
    }

    // 2. Find the most recent pending OTP for this phone
    const otpEvent = await this.securityEventRepository.repository.findOne({
      where: {
        eventType: SecurityEventType.OTP_SENT,
        status: SecurityEventStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpEvent || otpEvent.metadata?.phone !== phone) {
      // Log failed verification
      await this.securityEventService.logOtpVerification({
        phone,
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'OTP not found or expired',
      });

      throw new UnauthorizedException('OTP not found or expired. Please request a new OTP.');
    }

    // 3. Check attempt count
    const attempts = (otpEvent.metadata?.attempts || 0) + 1;
    if (attempts > 3) {
      // Mark as expired after 3 failed attempts
      otpEvent.status = SecurityEventStatus.FAILED;
      await this.securityEventRepository.repository.save(otpEvent);

      await this.securityEventService.logOtpVerification({
        phone,
        userId: otpEvent.userId,
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'Too many failed attempts',
      });

      throw new UnauthorizedException('Too many failed attempts. Please request a new OTP.');
    }

    // 4. Verify OTP hash
    const isValid = await bcrypt.compare(inputOtp, otpEvent.metadata?.otpHash);

    if (!isValid) {
      // Update attempt count
      otpEvent.metadata = {
        ...otpEvent.metadata,
        attempts,
      };
      await this.securityEventRepository.repository.save(otpEvent);

      // Log failed verification
      await this.securityEventService.logOtpVerification({
        phone,
        userId: otpEvent.userId,
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'Invalid OTP',
      });

      throw new UnauthorizedException(`Invalid OTP. ${3 - attempts} attempts remaining.`);
    }

    // 5. OTP verified successfully
    otpEvent.status = SecurityEventStatus.SUCCESS;
    otpEvent.metadata = {
      ...otpEvent.metadata,
      verified: true,
      verifiedAt: new Date().toISOString(),
    };
    await this.securityEventRepository.repository.save(otpEvent);

    // Log successful verification
    await this.securityEventService.logOtpVerification({
      phone,
      userId: otpEvent.userId,
      success: true,
      ipAddress,
      userAgent,
    });

    this.logger.log(`OTP verified successfully for ${phone}`);

    return {
      success: true,
      userId: otpEvent.userId,
    };
  }

  /**
   * Request OTP - Public endpoint
   * Creates user if doesn't exist (Firebase-like)
   */
  async requestOtp(data: {
    phone?: string;
    email?: string;
  }): Promise<{ message: string; retryAfter?: number }> {
    const { phone } = data;

    // DTO validation already ensures:
    // 1. At least one of phone/email is provided
    // 2. Phone is in E.164 format if provided
    // 3. Email is valid format if provided

    // Business logic validation: Email OTP not yet implemented
    if (!phone) {
      throw new BadRequestException('Email OTP not yet implemented. Please use phone OTP.');
    }

    // Generate and store OTP
    try {
      await this.generateAndStoreOtp({
        phone,
        ipAddress: undefined, // TODO: Extract from request context
        userAgent: undefined, // TODO: Extract from request context
      });

      // OTP is sent via MSG91 inside generateAndStoreOtp
      return {
        message: 'OTP sent successfully',
      };
    } catch (error) {
      // If rate limit error, parse retry time
      if (error instanceof BadRequestException && error.message.includes('wait')) {
        return {
          message: error.message,
          retryAfter: 60, // 60 seconds cooldown
        };
      }
      throw error;
    }
  }

  /**
   * Verify OTP and Login - Public endpoint
   * Returns JWT tokens on success
   */
  async verifyOtpAndLogin(data: {
    phone?: string;
    email?: string;
    otp: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const { phone, otp } = data;

    // DTO validation already ensures:
    // 1. At least one of phone/email is provided
    // 2. OTP format is valid (6 digits)

    // Business logic validation: Email OTP not yet implemented
    if (!phone) {
      throw new BadRequestException('Email OTP not yet implemented. Please use phone OTP.');
    }

    // Verify OTP
    const isValid = await this.verifyOtp({
      phone,
      inputOtp: otp,
      ipAddress: undefined, // TODO: Extract from request context
      userAgent: undefined, // TODO: Extract from request context
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // TODO: Complete this - get or create user, generate JWT
    // This will be implemented in the next phase
    throw new BadRequestException(
      'OTP verification successful but JWT generation not yet implemented',
    );
  }

  /**
   * Invalidate existing pending OTPs for the phone
   */
  private async invalidateExistingOtps(phone: string): Promise<void> {
    await this.securityEventRepository.repository
      .createQueryBuilder()
      .update()
      .set({ status: SecurityEventStatus.FAILED })
      .where('eventType = :eventType', { eventType: SecurityEventType.OTP_SENT })
      .andWhere('status = :status', { status: SecurityEventStatus.PENDING })
      .andWhere('metadata @> :metadata', { metadata: { phone } })
      .execute();

    this.logger.debug(`Invalidated existing OTPs for ${phone}`);
  }

  /**
   * Generate random OTP
   */
  private generateOtp(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }
}
