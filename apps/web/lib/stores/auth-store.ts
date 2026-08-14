import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { User } from '@/lib/types/auth';

// Re-export for backward compatibility
export type { ProfileSummary, User } from '@/lib/types/auth';

/**
 * The two roles that pass every permission check.
 *
 * They hold **no** rows in `role_permissions` — they bypass instead. An
 * explicit grant of all 42 codes would silently miss the 43rd added later,
 * and there would be a checkbox to untick by accident. A bypass cannot drift
 * and cannot lock you out.
 *
 * This is one of only two places these role names appear in the web app; the
 * other is `middleware.ts`, which runs on the edge and cannot reach this
 * store. Change one and you must change the other.
 *
 * `platform_admin` is deliberately absent — migration
 * 1855000000000-ResetRbacCatalog folded it into `super_admin` and deleted it.
 */
export const FULL_ACCESS_ROLES: readonly string[] = ['super_admin', 'admin'];

/** The one role that may open the admin panel and hand out roles. */
export const SUPER_ADMIN_ROLE = 'super_admin';

function userHasFullAccess(roles: readonly string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => FULL_ACCESS_ROLES.includes(role));
}

/**
 * Auth state interface
 */
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;

  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

/**
 * Auth Store
 * Manages authentication state with persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,

      // Set user and update authenticated state
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      // Set loading state
      setLoading: (loading) => set({ isLoading: loading }),

      // Set hydration state
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // Logout - clear user state
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      // Check if user has a specific permission.
      //
      // Full-access roles short-circuit: super_admin and admin hold no
      // grants at all, so without this they would see an app of greyed-out
      // buttons. The role check must come first.
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (userHasFullAccess(user.roles)) return true;
        return user.permissions?.includes(permission) ?? false;
      },

      // Check if user has any of the specified permissions
      hasAnyPermission: (permissions) => {
        const { user } = get();
        if (!user) return false;
        if (userHasFullAccess(user.roles)) return true;
        if (!user.permissions) return false;
        return permissions.some((p) => user.permissions.includes(p));
      },

      // Check if user has all of the specified permissions
      hasAllPermissions: (permissions) => {
        const { user } = get();
        if (!user) return false;
        if (userHasFullAccess(user.roles)) return true;
        if (!user.permissions) return false;
        return permissions.every((p) => user.permissions.includes(p));
      },

      // Check if user has specific role
      hasRole: (role) => {
        const { user } = get();
        return user?.roles?.includes(role) ?? false;
      },

      // Check if user has any of the specified roles
      hasAnyRole: (roles) => {
        const { user } = get();
        if (!user?.roles) return false;
        return roles.some((r) => user.roles.includes(r));
      },
    }),
    {
      name: 'oneohm-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * Hook to check if the user holds a full-access role.
 *
 * Uses the same set that the permission helpers short-circuit on, so the
 * "is admin" UI cue can never disagree with the actual bypass.
 */
export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.hasAnyRole([...FULL_ACCESS_ROLES]));
}

/**
 * Hook to get current user
 */
export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user);
}

/**
 * Hook to check authentication status
 */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Hook to check if auth store has hydrated from localStorage
 */
export function useHasHydrated(): boolean {
  return useAuthStore((state) => state._hasHydrated);
}
