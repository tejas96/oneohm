import * as crypto from 'crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@oneohm-epc/shared-types';
import { MoreThan } from 'typeorm';

import { CustomerProfileRepository } from '../../customers/repositories/customer-profile.repository';
import { EmployeeProfileRepository } from '../../employees/repositories/employee-profile.repository';
import { IamService } from '../../iam/services/iam.service';
import { ResellerProfileRepository } from '../../resellers/repositories/reseller-profile.repository';
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

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly iamService: IamService,
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly resellerProfileRepository: ResellerProfileRepository,
    private readonly employeeProfileRepository: EmployeeProfileRepository,
  ) {}

  /**
   * Email/password login
   * Recommended for admin and employee users
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    // Find user with roles
    const user = await this.userRepository.findByEmailWithRoles(email);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Inactive user login attempt: ${email}`);
      throw new UnauthorizedException('Account is not active');
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

    // TODO: Verify OTP from Redis/Cache
    // const storedOtp = await this.cacheManager.get(`otp:${phone}`);
    // if (!storedOtp || storedOtp !== otp) {
    //   throw new UnauthorizedException('Invalid or expired OTP');
    // }

    // TEMPORARY: For development, accept any 6-digit OTP
    if (otp?.length !== 6) {
      throw new UnauthorizedException('Invalid OTP format');
    }

    // Find user with roles
    const user = await this.userRepository.findByPhoneWithRoles(phone);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Inactive user login attempt: ${phone}`);
      throw new UnauthorizedException('Account is not active');
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
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if user still exists and is active
      const user = await this.userRepository.findByIdWithRoles(payload.sub);

      if (user?.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // TOKEN ROTATION: Generate new tokens (including new refresh token)
      const tokens = await this.generateTokens(user.id, user.roles ?? []);

      this.logger.log(`Token refreshed with rotation for user: ${user.id}`);

      return tokens;
    } catch (error) {
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

  private async generateTokens(
    userId: string,
    roles: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Load user permissions from database
    let permissions: string[] = [];
    try {
      permissions = await this.iamService.getUserPermissions(userId);
      this.logger.debug(`Loaded ${permissions.length} permissions for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to load permissions for user ${userId}:`, error);
    }

    const payload: JwtPayload = {
      sub: userId,
      roles,
      permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate user credentials (used by LocalStrategy)
   * Returns user if valid, null if invalid
   */
  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findByEmailWithRoles(email);

    if (user?.status !== UserStatus.ACTIVE) {
      return null;
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    return user;
  }

  /**
   * Generate JWT tokens for authenticated user (used by Passport strategies)
   * Accepts user object from strategy validation
   */
  async generateTokensForUser(user: UserEntity): Promise<LoginResponseDto> {
    const roles =
      user.roles
        ?.filter((r: any) => r != null) // Filter out null/undefined roles
        .map((r: any) => r.code || r) || [];

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
      this.logger.error(`Failed to fetch profiles for user ${userId}:`, error);
      return []; // Return empty array on error, don't fail login
    }
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
  async forgotPassword(email: string): Promise<{ message: string }> {
    // Find user by email (don't reveal if not found)
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      // Generate secure reset token
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Save token + expiry (15 min) to user
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await this.userRepository.save(user);

      // TODO: Send email with reset link
      // When email service is ready:
      // const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
      // await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

      this.logger.log(`Password reset requested for: ${email}`);

      // Only log sensitive token info in development
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(`Reset token (DEV ONLY): ${token}`);
        this.logger.debug(
          `Reset URL (DEV ONLY): ${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${token}`,
        );
      }
    } else {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return success (security - don't reveal if email exists)
    return { message: 'If an account exists, a reset link has been sent' };
  }

  /**
   * Reset password using token
   * Validates token and updates password
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token where expires > now
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

    // Update password (entity hook will hash it)
    user.passwordHash = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    this.logger.log(`Password reset successfully for user: ${user.email}`);

    return { message: 'Password reset successfully' };
  }
}
