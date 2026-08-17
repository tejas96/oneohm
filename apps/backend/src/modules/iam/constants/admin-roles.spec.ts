import { describe, expect, it } from '@jest/globals';

import { canViewAllProjects, hasAdminBypassRole, resolveProjectListMemberId } from './admin-roles';

const VIEWER = 'user-viewer';
const MEMBER_FILTER = 'user-other';

describe('hasAdminBypassRole', () => {
  it('matches super_admin and admin only', () => {
    expect(hasAdminBypassRole(['super_admin'])).toBe(true);
    expect(hasAdminBypassRole(['admin'])).toBe(true);
    expect(hasAdminBypassRole(['service', 'project_manager'])).toBe(false);
  });
});

describe('canViewAllProjects', () => {
  it('is true for admins even without projects.view', () => {
    expect(canViewAllProjects(['admin'], [])).toBe(true);
  });

  it('is true for projects.view and false otherwise', () => {
    expect(canViewAllProjects(['service'], ['projects.view'])).toBe(true);
    expect(canViewAllProjects(['service'], ['service.manage'])).toBe(false);
  });
});

describe('resolveProjectListMemberId', () => {
  it('pins field staff to themselves', () => {
    expect(
      resolveProjectListMemberId(['field'], ['projects.edit'], VIEWER, {
        customerId: 'cust-1',
        memberId: MEMBER_FILTER,
      }),
    ).toBe(VIEWER);
  });

  it('does not unscope on a bare customerId without service.manage or projects.view', () => {
    expect(
      resolveProjectListMemberId(['liaisoning'], ['customers.view'], VIEWER, {
        customerId: 'cust-1',
      }),
    ).toBe(VIEWER);
  });

  it('unscopes service.manage only when customerId is present', () => {
    expect(
      resolveProjectListMemberId(['service'], ['service.manage'], VIEWER, {
        customerId: 'cust-1',
      }),
    ).toBeUndefined();

    expect(resolveProjectListMemberId(['service'], ['service.manage'], VIEWER, {})).toBe(VIEWER);
  });

  it('lets projects.view see the org list and still honor memberId', () => {
    expect(resolveProjectListMemberId(['service'], ['projects.view'], VIEWER, {})).toBeUndefined();

    expect(
      resolveProjectListMemberId(['service'], ['projects.view'], VIEWER, {
        memberId: MEMBER_FILTER,
      }),
    ).toBe(MEMBER_FILTER);
  });
});
