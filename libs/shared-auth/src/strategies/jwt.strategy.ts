import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../dto/jwt-payload.dto';

/**
 * JWT Strategy
 * Validates JWT tokens and extracts user payload
 *
 * TODO: Implement user validation with database lookup
 * TODO: Add token blacklist check for logged-out tokens
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET'] || 'your-secret-key-change-this', // TODO: Move to config service
    });
  }

  /**
   * Validate JWT payload
   * Called automatically by Passport after token verification
   * @param payload - Decoded JWT payload
   * @returns User data to attach to request.user
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // TODO: Add database lookup to verify user still exists and is active
    // TODO: Check if user's organization is active
    // TODO: Verify roles haven't changed since token was issued

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return payload to be attached to request.user
    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      roles: payload.roles || [],
    };
  }
}
