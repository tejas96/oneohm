import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '../../../config/config.service';
import type { CurrentUser, JwtPayload } from '../types';

/**
 * JWT Strategy
 * Validates JWT tokens and extracts user payload
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secret = configService.jwt.secret;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validate JWT payload
   * Called automatically by Passport after token verification
   * @param payload - Decoded JWT payload
   * @returns User data to attach to request.user
   */
  async validate(payload: JwtPayload): Promise<CurrentUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return simplified payload to be attached to request.user
    // AuthService validates user existence on login
    // NEW IAM: Extract permissions from JWT
    // organizationId is optional - users can belong to multiple orgs
    return {
      id: payload.sub,
      organizationId: payload.organizationId, // Optional - may be undefined
      roles: payload.roles || [],
      permissions: payload.permissions || [], // NEW: Permissions from JWT
    };
  }
}
