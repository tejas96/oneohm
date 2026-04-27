import * as crypto from 'crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  SecurityEventCategory,
  SecurityEventStatus,
  SecurityEventType,
  UserStatus,
} from '@oneohm-epc/shared/types';
import { normalizePhoneToE164 } from '@oneohm-epc/shared/utils';
import type ms from 'ms';
import { MoreThan } from 'typeorm';

import { OtpService } from './otp.service';
import { PlatformSmsService } from './platform-sms.service';
import { ConfigService } from '../../../config/config.service';
import { CustomerProfileRepository } from '../../customers/repositories/customer-profile.repository';
import { EmployeeProfileRepository } from '../../employees/repositories/employee-profile.repository';
import { IamService } from '../../iam/services/iam.service';
import { ResellerProfileRepository } from '../../resellers/repositories/reseller-profile.repository';
import { SecurityEventService } from '../../security-events/services/security-event.service';
import { UserEntity } from '../../users/entities/user.entity';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { LoginDto, LoginResponseDto } from '../dto/login.dto';
import { ProfileSummaryDto, LoginUserDto } from '../dto/profile-summary.dto';
import { RefreshTokenResponseDto } from '../dto/refresh-token.dto';
import type { CurrentUserType, JwtPayload } from '../types';

interface OtpLoginDto {
  phone: string;
  otp: string;
}

interface OtpRequestDto {
  phone: string;
  userType?: 'customer' | 'reseller' | 'employee';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
  private readonly PASSWORD_RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly iamService: IamService,
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly resellerProfileRepository: ResellerProfileRepository,
    private readonly employeeProfileRepository: EmployeeProfileRepository,
    private readonly securityEventService: SecurityEventService,
    private readonly otpService: OtpService,
    private readonly platformSmsService: PlatformSmsService,
  ) {}

  /**
   * Email/password login
   * Recommended for admin and employee users
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    // Find user with roles (excludes soft-deleted)
    const user = await this.userRepository.findByEmailWithRoles(email);

    if (!user) {
      // Check if user was soft-deleted
      const deletedUser = await this.userRepository.repository
        .createQueryBuilder('user')
        .withDeleted()
        .where('user.email = :email', { email })
        .andWhere('user.deleted_at IS NOT NULL')
        .getOne();

      if (deletedUser) {
        this.logger.warn(`Deleted user login attempt: ${email}`);
        throw new UnauthorizedException(this.getAccountStatusMessage(deletedUser.status));
      }

      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active BEFORE password verification
    // so non-active users always get a clear account-status message
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Non-active user login attempt: ${email} (status: ${user.status})`);
      throw new UnauthorizedException(this.getAccountStatusMessage(user.status));
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.roles ?? []);

    // Fetch all profiles and permissions
    const profiles = await this.fetchUserProfiles(user.id);
    const permissions = await this.iamService.getUserPermissions(user.id);

    this.logger.log(`User logged in successfully: ${email}`);

    const loginUser: LoginUserDto = {
      id: user.id,
      email: user.email ?? '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profileCompleted: user.profileCompleted,
      roles: user.roles ?? [],
      permissions,
      profiles,
      emailVerified: !!user.emailVerifiedAt,
      phoneVerified: !!user.phoneVerifiedAt,
      fullName: `${user.firstName} ${user.lastName || ''}`.trim(),
    };

    return {
      ...tokens,
      user: loginUser,
    };
  }

  /**
   * Request OTP for phone number
   * Firebase-like behavior: Creates user if doesn't exist
   */
  async requestOtp(dto: OtpRequestDto): Promise<{ message: string; isNewUser: boolean }> {
    const { phone, userType } = dto;

    // Check if user exists
    let user = await this.userRepository.findByPhone(phone);
    let isNewUser = false;

    // Firebase-like: Auto-create user if doesn't exist
    if (!user) {
      user = await this.userRepository.create({
        phone,
        firstName: '', // Will be filled during profile completion
        lastName: '',
        profileCompleted: false,
        status: UserStatus.ACTIVE,
      });
      isNewUser = true;
      this.logger.log(`New user created with phone: ${phone}`);
    }

    // TODO: Implement OTP sending logic
    // For now, just log the OTP (in production, send via SMS/WhatsApp)
    const otp = this.generateOtp();
    this.logger.log(`OTP for ${phone}: ${otp} (userType: ${userType || 'not specified'})`);

    // TODO: Store OTP in Redis/Cache with expiry
    // await this.cacheManager.set(`otp:${phone}`, otp, 300); // 5 minutes

    return {
      message: 'OTP sent successfully',
      isNewUser,
    };
  }

  /**
   * Login with OTP
   * Verifies OTP and returns auth tokens
   */
  async loginWithOtp(dto: OtpLoginDto): Promise<LoginResponseDto> {
    const { phone, otp } = dto;

    if (otp?.length !== 6) {
      throw new UnauthorizedException('Invalid OTP format');
    }

    const isDev = this.configService.isDevelopment;
    if (!isDev) {
      // TODO: Verify OTP from Redis/Cache when production OTP service is ready
      // const storedOtp = await this.cacheManager.get(`otp:${phone}`);
      // if (!storedOtp || storedOtp !== otp) {
      //   throw new UnauthorizedException('Invalid or expired OTP');
      // }
      throw new UnauthorizedException('OTP verification service not configured');
    }

    // Find user with roles (excludes soft-deleted)
    const user = await this.userRepository.findByPhoneWithRoles(phone);

    if (!user) {
      const deletedUser = await this.userRepository.repository
        .createQueryBuilder('user')
        .withDeleted()
        .where('user.phone = :phone', { phone })
        .andWhere('user.deleted_at IS NOT NULL')
        .getOne();

      if (deletedUser) {
        throw new UnauthorizedException(this.getAccountStatusMessage(deletedUser.status));
      }
      throw new UnauthorizedException('User not found');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Non-active user OTP login attempt: ${phone} (status: ${user.status})`);
      throw new UnauthorizedException(this.getAccountStatusMessage(user.status));
    }

    // Verify phone if not already verified
    if (!user.phoneVerifiedAt) {
      await this.userRepository.verifyPhone(user.id);
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.roles ?? []);

    // TODO: Delete OTP from cache
    // await this.cacheManager.del(`otp:${phone}`);

    this.logger.log(`User logged in with OTP successfully: ${phone}`);

    // Fetch all profiles and permissions
    const profiles = await this.fetchUserProfiles(user.id);
    const permissions = await this.iamService.getUserPermissions(user.id);

    const loginUser: LoginUserDto = {
      id: user.id,
      email: user.email ?? '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profileCompleted: user.profileCompleted,
      roles: user.roles ?? [],
      permissions,
      profiles,
      emailVerified: !!user.emailVerifiedAt,
      phoneVerified: !!user.phoneVerifiedAt,
      fullName: `${user.firstName} ${user.lastName || ''}`.trim(),
    };

    return {
      ...tokens,
      user: loginUser,
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.jwt.refreshSecret,
      });

      // Reject tokens without loginAt (pre-deploy tokens or tampered tokens)
      if (!payload.loginAt) {
        this.logger.warn(`Refresh token missing loginAt for user: ${payload.sub}`);
        throw new UnauthorizedException('Session expired. Please login again.');
      }

      // Enforce absolute session expiry
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds > payload.loginAt + this.MAX_SESSION_DURATION_SECONDS) {
        this.logger.log(`Absolute session expired for user: ${payload.sub}`);
        throw new UnauthorizedException('Session expired. Please login again.');
      }

      // Check if user still exists and is active
      const user = await this.userRepository.findByIdWithRoles(payload.sub);

      if (user?.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // TOKEN ROTATION: Generate new tokens, carrying forward the original loginAt
      const tokens = await this.generateTokens(user.id, user.roles ?? [], payload.loginAt);

      this.logger.log(`Token refreshed with rotation for user: ${user.id}`);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Invalid refresh token', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate user by ID (used for JWT validation)
   */
  async validateUserById(userId: string): Promise<CurrentUserType | null> {
    const user = await this.userRepository.findByIdWithRoles(userId);

    if (user?.status !== UserStatus.ACTIVE) {
      return null;
    }

    // Load permissions
    let permissions: string[] = [];
    try {
      permissions = await this.iamService.getUserPermissions(userId);
    } catch {
      this.logger.warn(`Failed to load permissions during validation for user ${userId}`);
    }

    return {
      id: user.id,
      roles: user.roles ?? [],
      permissions,
    };
  }

  /**
   * Validate user credentials (used by LocalStrategy).
   * Throws UnauthorizedException with a status-specific message on failure:
   * - deleted user → archived message
   * - non-active user → per-status message (inactive/suspended/pending/archived)
   * - wrong password → generic "Invalid email or password"
   */
  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.userRepository.findByEmailWithRoles(email);

    if (!user) {
      const deletedUser = await this.userRepository.repository
        .createQueryBuilder('user')
        .withDeleted()
        .where('user.email = :email', { email })
        .andWhere('user.deleted_at IS NOT NULL')
        .getOne();

      if (deletedUser) {
        throw new UnauthorizedException(this.getAccountStatusMessage(deletedUser.status));
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Non-active user login attempt: ${email} (status: ${user.status})`);
      throw new UnauthorizedException(this.getAccountStatusMessage(user.status));
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.userRepository.updateLastLogin(user.id);

    return user;
  }

  /**
   * Generate JWT tokens for authenticated user (used by Passport strategies)
   * Accepts user object from strategy validation
   */
  async generateTokensForUser(user: UserEntity): Promise<LoginResponseDto> {
    const roles = user.roles?.filter((r) => r != null) || [];

    const tokens = await this.generateTokens(user.id, roles);

    // Fetch all profiles for the user
    const profiles = await this.fetchUserProfiles(user.id);

    // Fetch permissions for all user's roles using IAM service
    const permissions = await this.iamService.getUserPermissions(user.id);

    const loginUser: LoginUserDto = {
      id: user.id,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName,
      phone: user.phone || '',
      profileCompleted: user.profileCompleted || false,
      roles,
      permissions,
      profiles,
      emailVerified: !!user.emailVerifiedAt,
      phoneVerified: !!user.phoneVerifiedAt,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };

    return {
      ...tokens,
      user: loginUser,
    };
  }

  logout(userId: string): void {
    // TODO: Invalidate refresh tokens (store them in Redis/DB)
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Request password reset
   * Generates a reset token and logs it (email sending TODO)
   * Always returns success message for security (don't reveal if email exists)
   */
  async forgotPassword(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.securityEventService.logEvent({
      eventType: SecurityEventType.PASSWORD_RESET_REQUESTED,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: SecurityEventStatus.PENDING,
      ipAddress,
      userAgent,
      metadata: { email },
    });

    const user = await this.userRepository.findByEmail(email);

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRY_MS);
      await this.userRepository.save(user);

      this.logger.log(`Password reset requested for: ${email}`);

      if (this.configService.isDevelopment) {
        this.logger.debug(`Reset token (DEV ONLY): ${token}`);
        this.logger.debug(
          `Reset URL (DEV ONLY): ${this.configService.app.frontendUrl}/reset-password?token=${token}`,
        );
      }
    } else {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
    }

    return { message: 'If an account exists, a reset link has been sent' };
  }

  async requestPasswordResetOtp(
    phone: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const normalizedPhone = normalizePhoneToE164(phone);

    await this.securityEventService.logEvent({
      eventType: SecurityEventType.PASSWORD_RESET_REQUESTED,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: SecurityEventStatus.PENDING,
      ipAddress,
      userAgent,
      metadata: { phone: normalizedPhone },
    });

    const user = await this.userRepository.findByPhoneWithRoles(normalizedPhone);
    if (!user) {
      this.logger.warn(`Password reset OTP requested for non-existent phone: ${normalizedPhone}`);
      throw new BadRequestException(
        'No account found with this mobile number. Please check the number or contact support.',
      );
    }

    this.assertNotCustomerOnly(user);

    const { otp } = await this.otpService.generateAndStoreOtp({
      phone: normalizedPhone,
      userId: user.id,
      ipAddress,
      userAgent,
    });
    await this.platformSmsService.sendOtp(normalizedPhone, otp);

    this.logger.log(`Password reset OTP sent to phone: ${normalizedPhone}`);
    return { message: 'OTP sent successfully' };
  }

  async verifyPasswordResetOtp(
    phone: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ resetToken: string; maskedEmail: string }> {
    const normalizedPhone = normalizePhoneToE164(phone);

    const verificationResult = await this.otpService.verifyOtp({
      phone: normalizedPhone,
      inputOtp: otp,
      ipAddress,
      userAgent,
    });

    const user = verificationResult.userId
      ? await this.userRepository.findByIdWithRoles(verificationResult.userId)
      : await this.userRepository.findByPhoneWithRoles(normalizedPhone);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    this.assertNotCustomerOnly(user);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + this.PASSWORD_RESET_TOKEN_EXPIRY_MS);
    await this.userRepository.save(user);

    return {
      resetToken,
      maskedEmail: this.maskEmail(user.email),
    };
  }

  /**
   * Rejects users who only hold the 'customer' role.
   * The web app is for employees and resellers only.
   */
  private assertNotCustomerOnly(user: UserEntity): void {
    const roles = user.roles ?? [];
    const isCustomerOnly = roles.length > 0 && roles.every((r) => r === 'customer');
    if (isCustomerOnly) {
      throw new BadRequestException(
        'This portal is for employees and resellers only. Please contact your solar company for support.',
      );
    }
  }

  /**
   * Reset password using token
   * Validates token and updates password
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    await this.securityEventService.logEvent({
      eventType: SecurityEventType.PASSWORD_RESET_REQUESTED,
      eventCategory: SecurityEventCategory.AUTHENTICATION,
      status: SecurityEventStatus.PENDING,
      ipAddress,
      userAgent,
      metadata: { action: 'reset_attempt' },
    });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      this.logger.warn(`Invalid or expired password reset token attempted`);
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    this.logger.log(`Password reset successfully for user: ${user.email}`);

    return { message: 'Password reset successfully' };
  }

  private getAccountStatusMessage(status: string): string {
    const messages: Partial<Record<UserStatus, string>> = {
      [UserStatus.INACTIVE]: 'Your account is inactive. Please contact your administrator.',
      [UserStatus.SUSPENDED]: 'Your account has been suspended. Please contact your administrator.',
      [UserStatus.ARCHIVED]: 'Your account has been removed. Please contact your administrator.',
      [UserStatus.PENDING]: 'Your account is pending approval. Please contact your administrator.',
    };
    return (
      messages[status as UserStatus] ??
      'Your account is not active. Please contact your administrator.'
    );
  }

  private async generateTokens(
    userId: string,
    roles: string[],
    loginAt?: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Load user permissions from database
    let permissions: string[] = [];
    try {
      permissions = await this.iamService.getUserPermissions(userId);
      this.logger.debug(`Loaded ${permissions.length} permissions for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to load permissions for user ${userId}:`, error);
    }

    const accessPayload: JwtPayload = {
      sub: userId,
      roles,
      permissions,
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      roles,
      permissions,
      loginAt: loginAt ?? Math.floor(Date.now() / 1000),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.jwt.secret,
        expiresIn: this.configService.jwt.expiresIn as ms.StringValue,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.jwt.refreshSecret,
        expiresIn: this.configService.jwt.refreshExpiresIn as ms.StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private maskEmail(email?: string | null): string {
    if (!email) {
      return '';
    }

    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart) {
      return '';
    }

    const visiblePart = localPart.slice(0, 2);
    return `${visiblePart}***@${domainPart}`;
  }

  /**
   * Fetch all profiles for a user across all organizations
   */
  private async fetchUserProfiles(userId: string): Promise<ProfileSummaryDto[]> {
    try {
      // Fetch all profile types in parallel
      const [customerProfiles, resellerProfiles, employeeProfiles] = await Promise.all([
        this.customerProfileRepository.findByUserId(userId),
        this.resellerProfileRepository.findByUserId(userId),
        this.employeeProfileRepository.findByUserId(userId),
      ]);

      const profiles: ProfileSummaryDto[] = [];

      // Map customer profiles
      for (const profile of customerProfiles) {
        profiles.push({
          type: 'customer',
          profileId: profile.id,
          organizationId: profile.organizationId,
          organizationName: profile.organization?.name || 'Unknown Organization',
          isPrimary: false, // TODO: Add isPrimary logic if needed
          status: profile.status,
        });
      }

      // Map reseller profiles
      for (const profile of resellerProfiles) {
        profiles.push({
          type: 'reseller',
          profileId: profile.id,
          organizationId: profile.organizationId,
          organizationName: profile.organization?.name || 'Unknown Organization',
          isPrimary: false, // TODO: Add isPrimary logic if needed
          status: profile.status,
          businessName: profile.companyName,
        });
      }

      // Map employee profiles
      for (const profile of employeeProfiles) {
        profiles.push({
          type: 'employee',
          profileId: profile.id,
          organizationId: profile.organizationId,
          organizationName: profile.organization?.name || 'Unknown Organization',
          isPrimary: false, // TODO: Add isPrimary logic if needed
          status: profile.status,
          avatarUrl: profile.avatarUrl,
          designation: profile.designation,
          department: profile.department,
        });
      }

      // Set first profile as primary if exists
      if (profiles.length > 0) {
        profiles[0]!.isPrimary = true;
      }

      return profiles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch profiles for user ${userId}. Login will proceed without profile data.`,
        error instanceof Error ? error.stack : error,
      );
      return [];
    }
  }
}
