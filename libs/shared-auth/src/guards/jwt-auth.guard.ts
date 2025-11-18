import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
// NOTE: Reflector MUST be a regular import (not type-only) because it's injected in the constructor
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 * Protects routes requiring authentication
 * Checks for valid JWT token in Authorization header
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Call parent AuthGuard to validate JWT
    return super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(err: Error | null, user: TUser | false): TUser {
    // If error or no user, throw UnauthorizedException
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    return user;
  }
}
