import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { User } from '@/lib/types/auth';

// Re-export for backward compatibility
export type { ProfileSummary, User } from '@/lib/types/auth';

/**
 * Auth state interface
 */
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

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

      // Set user and update authenticated state
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      // Set loading state
      setLoading: (loading) => set({ isLoading: loading }),

      // Logout - clear user state
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      // Check if user has specific permission
      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions?.includes(permission) ?? false;
      },

      // Check if user has any of the specified permissions
      hasAnyPermission: (permissions) => {
        const { user } = get();
        if (!user?.permissions) return false;
        return permissions.some((p) => user.permissions.includes(p));
      },

      // Check if user has all of the specified permissions
      hasAllPermissions: (permissions) => {
        const { user } = get();
        if (!user?.permissions) return false;
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
    },
  ),
);

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.hasAnyRole(['admin', 'super_admin', 'platform_admin']));
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
