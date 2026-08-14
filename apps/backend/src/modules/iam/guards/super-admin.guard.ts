import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { CurrentUserType } from '../../auth/types';

/**
 * The only role check left in the backend.
 *
 * Permission enforcement is frontend-only for now — every other endpoint is
 * protected by `JwtAuthGuard` alone. The endpoints that hand out roles are
 * different in kind: without this, any logged-in user could POST to
 * `/iam/user-roles` and assign themselves `super_admin`. That escalation would
 * be permanent, invisible, and would then unlock the entire UI for them.
 *
 * Guards the 9 IAM write endpoints only. `admin` is deliberately refused —
 * only `super_admin` administers roles.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUserType }>();
    const roles = request.user?.roles ?? [];

    if (!roles.includes('super_admin')) {
      throw new ForbiddenException('Only a superadmin can change roles or role assignments.');
    }

    return true;
  }
}
