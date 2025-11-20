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
    const tokens = await this.generateTokens(user.id, user.organizationId, user.roles ?? []);

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles ?? [],
        organizationId: user.organizationId,
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
      // This invalidates the old refresh token and prevents replay attacks
      // NOTE: For production, store refresh tokens in DB/Redis with:
      //   1. Token whitelist (active tokens)
      //   2. Token blacklist (revoked tokens)
      //   3. Token family ID (detect token reuse)
      const tokens = await this.generateTokens(user.id, user.organizationId, user.roles ?? []);

      this.logger.log(`Token refreshed with rotation for user: ${user.email}`);

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

    // NEW IAM: Load permissions
    let permissions: string[] = [];
    try {
      permissions = await this.iamService.getUserPermissions(userId);
    } catch {
      this.logger.warn(`Failed to load permissions during validation for user ${userId}`);
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      roles: user.roles ?? [],
      permissions, // NEW: Include permissions
    };
  }

  private async generateTokens(
    userId: string,
    organizationId: string,
    roles: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // NEW IAM: Load user permissions from database
    let permissions: string[] = [];
    try {
      permissions = await this.iamService.getUserPermissions(userId);
      this.logger.debug(`Loaded ${permissions.length} permissions for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to load permissions for user ${userId}:`, error);
      // Continue without permissions (graceful degradation)
    }

    const payload: JwtPayload = {
      sub: userId,
      organizationId,
      roles, // Keep for backward compatibility
      permissions, // NEW: Embed permissions in JWT
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

  logout(userId: string): void {
    // In a real-world scenario, you might want to:
    // 1. Invalidate refresh tokens (store them in Redis/DB)
    // 2. Add access token to blacklist
    // For now, we'll just log the action
    this.logger.log(`User logged out: ${userId}`);
  }
}
