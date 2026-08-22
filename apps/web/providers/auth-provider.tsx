'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import apiClient, { clearTokens, getRefreshToken, setTokens } from '@/lib/api/client';
import { FULL_ACCESS_ROLES, useAuthStore } from '@/lib/stores/auth-store';
import type {
  AuthUser,
  ForgotPasswordByPhoneData,
  ForgotPasswordData,
  LoginCredentials,
  LoginResponse,
  OtpRequestData,
  OtpRequestResponse,
  OtpVerifyData,
  PasswordResetOtpVerifyResponse,
  PasswordResetResponse,
  ProfileSummary,
  ResetPasswordData,
  User,
  VerifyPasswordResetOtpData,
} from '@/lib/types/auth';
import { getErrorMessage } from '@/lib/utils';

// Re-export types for backward compatibility
export type { ProfileSummary, User };

/**
 * Auth context type - all state and actions
 */
interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  /**
   * True once `/auth/me` has confirmed roles and permissions for this session.
   *
   * Until then the store is serving the list persisted in localStorage, which
   * is whatever the user held when they last loaded a page. That is fine for
   * deciding what to RENDER — it avoids a flash of missing UI, and a wrong
   * guess is corrected a moment later. It is not fine for deciding what to
   * FETCH: a permission revoked since the last visit would still let its
   * request go out and land the data in the browser. Gate data on this.
   */
  permissionsConfirmed: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  requestOtp: (data: OtpRequestData) => Promise<OtpRequestResponse>;
  verifyOtp: (data: OtpVerifyData) => Promise<LoginResponse>;
  forgotPassword: (data: ForgotPasswordData) => Promise<PasswordResetResponse>;
  requestPasswordResetOtp: (data: ForgotPasswordByPhoneData) => Promise<PasswordResetResponse>;
  verifyPasswordResetOtp: (
    data: VerifyPasswordResetOtpData,
  ) => Promise<PasswordResetOtpVerifyResponse>;
  resetPassword: (data: ResetPasswordData) => Promise<PasswordResetResponse>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<User | null>;

  // Permission helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Transform AuthUser from API to User format
 */
function transformAuthUser(authUser: AuthUser): User {
  // Find primary profile or first profile with organizationId

  return {
    id: authUser.id,
    email: authUser.email,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    fullName: authUser.fullName,
    phone: authUser.phone,
    roles: authUser.roles ?? [],
    permissions: authUser.permissions ?? [],
    profiles: authUser.profiles ?? [],
    emailVerified: authUser.emailVerified,
    phoneVerified: authUser.phoneVerified,
    profileCompleted: authUser.profileCompleted,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider
 * Provides authentication state and actions to the entire app via React Context.
 * Uses Zustand store for persistent user data (survives page refresh).
 * Initializes auth state on mount by checking for existing tokens.
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const queryClient = useQueryClient();

  // Zustand store - persisted to localStorage automatically
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const storeLogout = useAuthStore((state) => state.logout);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // Local state for loading/error (not persisted)
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionsConfirmed, setPermissionsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures and prevent concurrent initAuth calls
  const userRef = useRef(user);
  userRef.current = user;
  const initializingRef = useRef(false);

  // Initialize auth on mount - WAIT for Zustand hydration first
  useEffect(() => {
    if (!hasHydrated || initializingRef.current) {
      return;
    }

    let cancelled = false;
    initializingRef.current = true;

    const initAuth = async (): Promise<void> => {
      try {
        const refreshToken = getRefreshToken();

        if (refreshToken) {
          try {
            const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
              '/auth/refresh',
              { refreshToken },
            );
            if (cancelled) return;
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            setTokens(accessToken, newRefreshToken);
          } catch {
            if (cancelled) return;
            clearTokens();
            storeLogout();
          }
        } else if (userRef.current) {
          clearTokens();
          storeLogout();
        }
      } finally {
        if (!cancelled) {
          initializingRef.current = false;
          setIsInitialized(true);
        }
      }
    };

    void initAuth();

    return () => {
      cancelled = true;
      initializingRef.current = false;
    };
  }, [hasHydrated, storeLogout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
        const { accessToken, refreshToken, user: authUser } = response.data;

        setTokens(accessToken, refreshToken);
        const transformedUser = transformAuthUser(authUser);
        setUser(transformedUser); // Zustand will persist to localStorage

        return response.data;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const requestOtp = useCallback(async (data: OtpRequestData): Promise<OtpRequestResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<OtpRequestResponse>('/auth/otp/request', data);
      return response.data;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(
    async (data: OtpVerifyData): Promise<LoginResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<LoginResponse>('/auth/otp/verify', data);
        const { accessToken, refreshToken, user: authUser } = response.data;

        setTokens(accessToken, refreshToken);
        const transformedUser = transformAuthUser(authUser);
        setUser(transformedUser); // Zustand will persist to localStorage

        return response.data;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const forgotPassword = useCallback(
    async (data: ForgotPasswordData): Promise<PasswordResetResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<PasswordResetResponse>('/auth/forgot-password', data);
        return response.data;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resetPassword = useCallback(
    async (data: ResetPasswordData): Promise<PasswordResetResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<PasswordResetResponse>('/auth/reset-password', data);
        return response.data;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const requestPasswordResetOtp = useCallback(
    async (data: ForgotPasswordByPhoneData): Promise<PasswordResetResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<PasswordResetResponse>(
          '/auth/forgot-password-otp',
          data,
        );
        return response.data;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const verifyPasswordResetOtp = useCallback(
    async (data: VerifyPasswordResetOtpData): Promise<PasswordResetOtpVerifyResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<PasswordResetOtpVerifyResponse>(
          '/auth/verify-forgot-password-otp',
          data,
        );
        return response.data;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    // Call backend logout (fire and forget)
    apiClient.post('/auth/logout').catch(() => {
      // Ignore errors - we're logging out anyway
    });

    clearTokens();
    storeLogout(); // Clear Zustand store (and localStorage)
    setError(null);
    queryClient.clear();
  }, [queryClient, storeLogout]);

  /**
   * Pull roles and permissions fresh from the server.
   *
   * Permissions are baked into the JWT at login, so without this a change a
   * superadmin makes would not reach the user until their token expired.
   * Called once on mount, so a change lands on their next page load.
   *
   * Merges rather than replaces: `/auth/me` returns the core user record but
   * not `profiles`, and overwriting the stored user wholesale would drop them.
   *
   * On failure it returns the cached user and leaves the store alone. A
   * network blip must never look like "you lost all your permissions".
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const current = userRef.current;
    if (!current) return null;

    try {
      const { data } = await apiClient.get<{ roles?: string[]; permissions?: string[] }>(
        '/auth/me',
      );

      const next: User = {
        ...current,
        roles: data.roles ?? current.roles,
        permissions: data.permissions ?? current.permissions,
      };

      setUser(next);
      return next;
    } catch {
      return current;
    }
  }, [setUser]);

  // Refresh access on mount, once auth has settled. `refreshUser` reads the
  // user through a ref, so it is stable and this cannot loop.
  useEffect(() => {
    if (!isInitialized) return;
    // Resolved either way: on a network failure `refreshUser` returns the
    // cached user rather than throwing, and holding every gated query open for
    // ever because /auth/me blipped would be a worse failure than briefly
    // trusting the cache.
    void refreshUser().finally(() => setPermissionsConfirmed(true));
  }, [isInitialized, refreshUser]);

  // Permission helpers - use Zustand store's methods
  const storeHasPermission = useAuthStore((state) => state.hasPermission);
  const storeHasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const storeHasAllPermissions = useAuthStore((state) => state.hasAllPermissions);
  const storeHasRole = useAuthStore((state) => state.hasRole);
  const storeHasAnyRole = useAuthStore((state) => state.hasAnyRole);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      isInitialized,
      permissionsConfirmed,
      error,
      login,
      requestOtp,
      verifyOtp,
      forgotPassword,
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      logout,
      clearError,
      refreshUser,
      hasPermission: storeHasPermission,
      hasAnyPermission: storeHasAnyPermission,
      hasAllPermissions: storeHasAllPermissions,
      hasRole: storeHasRole,
      hasAnyRole: storeHasAnyRole,
    }),
    [
      user,
      isLoading,
      isInitialized,
      permissionsConfirmed,
      error,
      login,
      requestOtp,
      verifyOtp,
      forgotPassword,
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      logout,
      clearError,
      refreshUser,
      storeHasPermission,
      storeHasAnyPermission,
      storeHasAllPermissions,
      storeHasRole,
      storeHasAnyRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Access authentication state and actions from anywhere in the app.
 * Must be used within an AuthProvider.
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * // Login
 * await login({ email: 'test@example.com', password: 'password123' });
 *
 * // Check permissions
 * if (hasPermission('customers.view')) { ... }
 *
 * // Logout
 * logout();
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if the current user holds a full-access role.
 *
 * Reads the shared `FULL_ACCESS_ROLES` rather than repeating the names, so
 * this cannot drift from the bypass the permission helpers actually use.
 */
export function useIsAdmin(): boolean {
  const { hasAnyRole } = useAuth();
  return hasAnyRole([...FULL_ACCESS_ROLES]);
}

/**
 * Hook to get current user
 */
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check authentication status
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
