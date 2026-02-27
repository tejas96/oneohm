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

import apiClient, { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type {
  AuthUser,
  ForgotPasswordData,
  LoginCredentials,
  LoginResponse,
  OtpRequestData,
  OtpRequestResponse,
  OtpVerifyData,
  PasswordResetResponse,
  ProfileSummary,
  ResetPasswordData,
  User,
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
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  requestOtp: (data: OtpRequestData) => Promise<OtpRequestResponse>;
  verifyOtp: (data: OtpVerifyData) => Promise<LoginResponse>;
  forgotPassword: (data: ForgotPasswordData) => Promise<PasswordResetResponse>;
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
  const primaryProfile = authUser.profiles?.find((p) => p.isPrimary);
  const firstProfileWithOrg = authUser.profiles?.find((p) => p.organizationId);
  const organizationId = primaryProfile?.organizationId ?? firstProfileWithOrg?.organizationId;

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
    organizationId,
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
        let token = getAccessToken();
        
        if (!token) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
                '/auth/refresh',
                { refreshToken }
              );
              if (cancelled) return;
              const { accessToken, refreshToken: newRefreshToken } = response.data;
              setTokens(accessToken, newRefreshToken);
              token = accessToken;
            } catch {
              if (cancelled) return;
              clearTokens();
              storeLogout();
            }
          }
        }
        
        if (cancelled) return;

        // Read user from ref to get latest value without depending on it
        if (!token && userRef.current) {
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

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
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
  }, [setUser]);

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

  const verifyOtp = useCallback(async (data: OtpVerifyData): Promise<LoginResponse> => {
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
  }, [setUser]);

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

  const refreshUser = useCallback((): Promise<User | null> => {
    // Since login response has full user data, refreshUser can just return cached user
    // For actual refresh from server, user needs to re-login
    return Promise.resolve(user);
  }, [user]);

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
      error,
      login,
      requestOtp,
      verifyOtp,
      forgotPassword,
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
      error,
      login,
      requestOtp,
      verifyOtp,
      forgotPassword,
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
 * if (hasPermission('users:read')) { ... }
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
 * Hook to check if current user is admin
 */
export function useIsAdmin(): boolean {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(['admin', 'super_admin', 'platform_admin']);
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
