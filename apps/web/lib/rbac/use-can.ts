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
  // Subscribe to `user`, not just the store's helper methods.
  //
  // Those helpers read `get().user` at call time, so they always return the
  // right answer — but their *identity* never changes. Depending only on them
  // gives `can` a permanently stable identity, and any `useMemo([can])`
  // downstream then caches gating from the first render and never updates.
  // That showed up as the rail and the panel disagreeing after a permission
  // refresh, and would ship as "permissions only apply after a hard refresh".
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const isSuperAdmin = (user?.roles ?? []).includes(SUPER_ADMIN_ROLE);

  const can = useCallback(
    (gate: Gate): boolean => {
      if (gate === ALWAYS_OPEN) return true;
      if (gate === SUPERADMIN_ONLY) return isSuperAdmin;
      return hasPermission(gate);
    },
    // `user` is the dependency that actually moves.
    [user, hasPermission, isSuperAdmin],
  );

  return { can, isSuperAdmin };
}
