import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { canViewAllProjects, hasAdminBypassRole } from '../../iam/constants';
import { ProjectTeamRepository } from '../repositories/project-team.repository';

const TEAM_GUARD_READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * ProjectTeamGuard
 *
 * Writes (POST/PATCH/DELETE): admin or project team member.
 * Reads: those, plus anyone with org-wide `projects.view` — the same grant
 * that unlocks the project list. `projects.view` is not a write bypass.
 */
@Injectable()
export class ProjectTeamGuard implements CanActivate {
  constructor(private readonly teamRepository: ProjectTeamRepository) {}

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
