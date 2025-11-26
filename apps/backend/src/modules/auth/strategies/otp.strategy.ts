import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@oneohm-epc/shared-types';
import { Request } from 'express';
import { Strategy } from 'passport-custom';

import { UserEntity } from '../../users/entities/user.entity';
import { UserService } from '../../users/services/user.service';
import { OtpService } from '../services/otp.service';

/**
 * OTP Strategy (Phone/Email OTP Authentication)
 * Custom Passport strategy for stateful OTP verification
 *
 * Flow:
 * 1. User requests OTP (separate endpoint)
 * 2. User submits OTP for verification (this strategy)
 * 3. Strategy validates OTP and returns user
 */
@Injectable()
export class OtpStrategy extends PassportStrategy(Strategy, 'otp') {
  constructor(
    private readonly otpService: OtpService,
    private readonly userService: UserService,
  ) {
    super();
  }

  /**
   * Validate OTP
   * Called automatically by Passport
   *
   * @param req - Express request (contains phone/email + OTP in body)
   * @returns User object if OTP valid, throws UnauthorizedException if invalid
   */
  async validate(req: Request): Promise<UserEntity> {
    const { phone, email, otp } = req.body as {
      phone?: string;
      email?: string;
      otp?: string;
    };

    // Validate input
    if (!otp) {
      throw new UnauthorizedException('OTP is required');
    }

    if (!phone && !email) {
      throw new UnauthorizedException('Phone or email is required');
    }

    // For now, only phone OTP supported
    if (!phone) {
      throw new UnauthorizedException('Email OTP not yet implemented');
    }

    // Verify OTP
    const verificationResult = await this.otpService.verifyOtp({
      phone,
      inputOtp: otp,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!verificationResult.success) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Get or create user (Firebase-like behavior)
    let user: UserEntity;

    try {
      // Try to find existing user (throws NotFoundException if not found)
      user = await this.userService.findByPhone(phone);
    } catch {
      // User doesn't exist, create new one (Firebase-like auto-registration)
      user = await this.userService.create({
        phone,
        firstName: 'User', // Temporary - will be updated on profile completion
        // Don't set email - leave it undefined/null for OTP-only users
        status: UserStatus.ACTIVE,
        // No roles assigned initially - will be assigned when user completes profile
      });
    }

    return user; // Attached to request.user
  }
}
