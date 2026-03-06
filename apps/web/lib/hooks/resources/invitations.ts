'use client';

import { useResourceList, useResourceMutations, type BaseFilters } from '../core';

// ── Types ──────────────────────────────────────────────────────

export interface Invitation {
  id: string;
  email: string;
  status: string;
  organizationId: string;
  organizationName?: string;
  roleId: string;
  roleName?: string;
  expiresAt: string;
  invitedBy?: string;
  createdAt: string;
}

export interface InvitationFilters extends BaseFilters {
  organizationId?: string;
  status?: string;
}

// ── Hooks ──────────────────────────────────────────────────────

export function useInvitations(): ReturnType<
  typeof useResourceList<Invitation, InvitationFilters>
> {
  return useResourceList<Invitation, InvitationFilters>({
    resource: 'invitations',
    endpoint: '/invitations',
    defaultPageSize: 10,
    syncToUrl: false,
    requiresOrg: false,
    paramMapping: { limit: 'pageSize' },
  });
}

export function useInvitationMutations(): ReturnType<typeof useResourceMutations<Invitation>> {
  return useResourceMutations<Invitation>({
    resource: 'invitations',
    endpoint: '/invitations',
    requiresOrg: false,
    customActions: {
      resend: {
        method: 'POST',
        path: (id) => `/invitations/${id}/resend`,
      },
    },
    toast: {
      create: { success: 'Invitation sent successfully', error: 'Failed to send invitation' },
      delete: { success: 'Invitation cancelled', error: 'Failed to cancel invitation' },
      resend: { success: 'Invitation resent', error: 'Failed to resend invitation' },
    },
  });
}
