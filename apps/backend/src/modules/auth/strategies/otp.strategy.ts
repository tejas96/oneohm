import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserProfileType } from '@tejas96/shared/types';
import { Request } from 'express';
import { Strategy } from 'passport-custom';

import { UserEntity } from '../../users/entities/user.entity';
import { ProfileService } from '../../users/services/profile.service';
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
    private readonly profileService: ProfileService,
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
    const { phone, email, otp, loginUserType } = req.body as {
      phone?: string;
      email?: string;
      otp?: string;
      loginUserType?: UserProfileType;
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

    if (!loginUserType) {
      throw new UnauthorizedException('loginUserType is required');
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

    // Get existing user (No Firebase-like auto-registration anymore)
    let user: UserEntity;

    try {
      user = await this.userService.findByPhone(phone);
    } catch {
      throw new UnauthorizedException('User not found');
    }

    // Verify that the user has the requested profile type (Customer or Employee)
    const profiles = await this.profileService.getUserProfilesByType(user.id, loginUserType);
    if (!profiles || profiles.length === 0) {
      throw new UnauthorizedException(
        `User record found but ${loginUserType} profile details not found. Please complete your onboarding.`,
      );
    }

    return user; // Attached to request.user
  }
}
