import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { JwtPayload } from '@oneohm-epc/shared-auth';
import { UserStatus } from '@oneohm-epc/shared-types';

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
    const tokens = await this.generateTokens(user.id, user.roles || []);

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles || [],
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

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.roles || []);

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      this.logger.error('Invalid refresh token', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.userRepository.findByIdWithRoles(userId);

    if (user?.status !== UserStatus.ACTIVE) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles || [],
      organizationId: user.organizationId,
    };
  }

  private async generateTokens(
    userId: string,
    roles: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      roles,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as Record<string, any>, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload as Record<string, any>, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    // In a real-world scenario, you might want to:
    // 1. Invalidate refresh tokens (store them in Redis/DB)
    // 2. Add access token to blacklist
    // For now, we'll just log the action
    this.logger.log(`User logged out: ${userId}`);
  }
}
