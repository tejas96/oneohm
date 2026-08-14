'use client';

import { useCallback } from 'react';

import { ALWAYS_OPEN, SUPERADMIN_ONLY, type Gate } from './catalog';

import { SUPER_ADMIN_ROLE, useAuthStore } from '@/lib/stores/auth-store';

export interface UseCanResult {
  /** True when the current user may pass this gate. */
  can: (gate: Gate) => boolean;
  /** True only for `super_admin`. `admin` is false — see below. */
  isSuperAdmin: boolean;
}

/**
 * The single question the UI asks: "may this user do X?"
 *
 * `SUPERADMIN_ONLY` deliberately refuses `admin`. That is the whole /admin
 * rule: an admin can do everything in the app, but cannot open the admin
 * panel or hand out roles. Every other gate treats admin as full access.
 */
export function useCan(): UseCanResult {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);

  const isSuperAdmin = hasRole(SUPER_ADMIN_ROLE);

  const can = useCallback(
    (gate: Gate): boolean => {
      if (gate === ALWAYS_OPEN) return true;
      if (gate === SUPERADMIN_ONLY) return isSuperAdmin;
      return hasPermission(gate);
    },
    [hasPermission, isSuperAdmin],
  );

  return { can, isSuperAdmin };
}
