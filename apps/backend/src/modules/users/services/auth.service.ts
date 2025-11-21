import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CurrentUserType, JwtPayload } from '@oneohm-epc/shared-auth';
import { UserStatus } from '@oneohm-epc/shared-types';

import { IamService } from '../../iam/services/iam.service';
import { LoginDto, LoginResponseDto } from '../dto/login.dto';
import { RefreshTokenResponseDto } from '../dto/refresh-token.dto';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserRepository } from '../repositories/user.repository';

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
  ) {}

  /**
   * Traditional email/password login
   * @deprecated Use OTP login for better security
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

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? '',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileCompleted: user.profileCompleted,
        roles: user.roles ?? [],
      },
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

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email ?? '',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileCompleted: user.profileCompleted,
        roles: user.roles ?? [],
      },
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

  async validateUser(userId: string): Promise<CurrentUserType | null> {
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

  logout(userId: string): void {
    // TODO: Invalidate refresh tokens (store them in Redis/DB)
    this.logger.log(`User logged out: ${userId}`);
  }
}
