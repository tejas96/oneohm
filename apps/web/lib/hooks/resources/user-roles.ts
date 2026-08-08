'use client';

import { useResourceSubList, useResourceMutations } from '../core';

// ── Types ──────────────────────────────────────────────────────

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleName?: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

// ── Hooks ──────────────────────────────────────────────────────

export function useUserRoles(
  userId: string,
): ReturnType<typeof useResourceSubList<UserRoleAssignment>> {
  return useResourceSubList<UserRoleAssignment>(
    {
      resource: 'user-roles',
      endpoint: '/iam/user-roles/user/{parentId}',
      parentResource: 'users',
      parentIdInPath: true,
    },
    userId,
  );
}

export function useUserRoleMutations(): ReturnType<
  typeof useResourceMutations<UserRoleAssignment>
> {
  return useResourceMutations<UserRoleAssignment>({
    resource: 'user-roles',
    endpoint: '/iam/user-roles',
    invalidateRelated: ['users', 'user-roles'],
    toast: {
      delete: { success: 'Role removed successfully', error: 'Failed to remove role' },
    },
  });
}
