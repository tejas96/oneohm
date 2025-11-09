import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import type { CurrentUser, JwtPayload } from '../dto/jwt-payload.dto';

/**
 * JWT Strategy
 * Validates JWT tokens and extracts user payload
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
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
    if (!payload.sub || !payload.organizationId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return simplified payload to be attached to request.user
    // AuthService validates user existence on login
    return {
      id: payload.sub,
      organizationId: payload.organizationId,
      roles: payload.roles || [],
    };
  }
}
