import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';

import { ProjectTeamGuard } from './project-team.guard';

function context(overrides: {
  method: string;
  user?: { id: string; roles?: string[]; permissions?: string[] };
  projectId?: string;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: overrides.method,
        user: overrides.user,
        params: { projectId: overrides.projectId ?? 'project-1' },
      }),
    }),
  } as ExecutionContext;
}

describe('ProjectTeamGuard', () => {
  const teamRepository = {
    isTeamMember: jest.fn<Promise<boolean>, [string, string]>(),
  };
  const guard = new ProjectTeamGuard(teamRepository as never);

  it('lets projects.view read a project they are not on', async () => {
    teamRepository.isTeamMember.mockResolvedValue(false);
    await expect(
      guard.canActivate(
        context({
          method: 'GET',
          user: { id: 'u1', roles: ['service'], permissions: ['projects.view'] },
        }),
      ),
    ).resolves.toBe(true);
    expect(teamRepository.isTeamMember).not.toHaveBeenCalled();
  });

  it('rejects projects.view on mutations unless they are on the team', async () => {
    teamRepository.isTeamMember.mockResolvedValue(false);
    await expect(
      guard.canActivate(
        context({
          method: 'POST',
          user: { id: 'u1', roles: ['service'], permissions: ['projects.view'] },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets admins mutate without team membership', async () => {
    await expect(
      guard.canActivate(
        context({
          method: 'DELETE',
          user: { id: 'u1', roles: ['super_admin'], permissions: [] },
        }),
      ),
    ).resolves.toBe(true);
  });
});
