import { ForbiddenException } from '@nestjs/common';

import type { CurrentUserType } from '../../../auth/types';
import { hasAdminBypassRole } from '../../../iam/constants/admin-roles';

/**
 * The backend has no permission guards (enforcement lives in web middleware),
 * so money routes check here, from the JWT — the same way canViewAllProjects
 * reads `projects.view`. Codes come from the existing catalog only.
 */
export function requirePermission(user: CurrentUserType, code: string): void {
  if (hasAdminBypassRole(user.roles ?? [])) return;
  if ((user.permissions ?? []).includes(code)) return;
  throw new ForbiddenException(`You need the "${code}" permission for this`);
}
