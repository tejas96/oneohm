import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { hasAdminBypassRole } from '../../iam/constants';
import { ProjectTeamRepository } from '../repositories/project-team.repository';

/**
 * ProjectTeamGuard
 * Checks if the current user is a member of the project or an admin
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
    if (hasAdminBypassRole(roles)) {
      return true;
    }

    const isTeamMember = await this.teamRepository.isTeamMember(user.id, projectId);

    if (!isTeamMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return true;
  }
}
