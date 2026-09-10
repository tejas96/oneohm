'use client';

import { useResourceMutations } from '../core';

// ── Types ──────────────────────────────────────────────────────

export interface Invitation {
  id: string;
  email: string;
  status: string;
  roleId: string;
  roleName?: string;
  expiresAt: string;
  invitedBy?: string;
  createdAt: string;
}

// ── Hooks ──────────────────────────────────────────────────────

export function useInvitationMutations(): ReturnType<typeof useResourceMutations<Invitation>> {
  return useResourceMutations<Invitation>({
    resource: 'invitations',
    endpoint: '/invitations',
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
