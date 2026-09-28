import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RESELLER_ALLOWED_KEY, ResellerContextService } from '../../../common/reseller';
import { canViewAllProjects, hasAdminBypassRole } from '../../iam/constants';
import { ProjectTeamRepository } from '../repositories/project-team.repository';

const TEAM_GUARD_READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * ProjectTeamGuard
 *
 * Writes (POST/PATCH/DELETE): admin or project team member.
 * Reads: those, plus anyone with org-wide `projects.view` — the same grant
 * that unlocks the project list. `projects.view` is not a write bypass.
 *
 * A reseller is never a project team member (he has no `project_team_members`
 * row and no `projects.view`), so unmodified this guard would 403 every route
 * here before the reseller wall's own interceptor — which runs later, as an
 * interceptor rather than a guard — ever gets a say. The wall opens exactly one
 * read per controller behind this guard (the team/task LIST); ownership of the
 * project is asserted in the handler itself (`ResellerOwnershipService`), same
 * as every other opened route, so this guard only needs to stop treating a
 * reseller as "not a team member" on that one route and defer to the wall.
 */
@Injectable()
export class ProjectTeamGuard implements CanActivate {
  constructor(
    private readonly teamRepository: ProjectTeamRepository,
    private readonly reflector: Reflector,
    private readonly resellerContext: ResellerContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId || request.params.id;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!projectId) {
      return true;
    }

    const roles: string[] = user.roles || [];
    const permissions: string[] = user.permissions || [];
    const method = String(request.method || '').toUpperCase();

    if (hasAdminBypassRole(roles)) {
      return true;
    }

    const resellerId = await this.resellerContext.resellerIdForUser(user.id);
    if (resellerId) {
      const allowed = this.reflector.getAllAndOverride<boolean>(RESELLER_ALLOWED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (allowed) return true;
      throw new ForbiddenException('This is not available to resellers.');
    }

    if (TEAM_GUARD_READ_METHODS.has(method) && canViewAllProjects(roles, permissions)) {
      return true;
    }

    const isTeamMember = await this.teamRepository.isTeamMember(user.id, projectId);

    if (!isTeamMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return true;
  }
}
