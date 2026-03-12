import { type ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';

import type { CurrentUserType } from '../types';

/**
 * Current User Decorator
 * Extract the current user from the request object
 * Returns the authenticated user with full type safety
 * @example getCurrentUser(@CurrentUser() user: CurrentUserType)
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserType }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    return user;
  },
);
