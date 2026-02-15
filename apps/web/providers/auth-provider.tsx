'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import apiClient, { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/api/client';
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
    organizationId: authUser.profiles?.find((p) => p.isPrimary)?.organizationId,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider
 * Provides authentication state and actions to the entire app via React Context.
 * Initializes auth state on mount by checking for existing tokens.
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount - check for existing token and refresh user
  useEffect(() => {
    const initAuth = async () => {
      let token = getAccessToken();
      
      // If no access token but refresh token exists, attempt to refresh
      if (!token) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            // Attempt to refresh tokens
            const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
              '/auth/refresh',
              { refreshToken }
            );
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            setTokens(accessToken, newRefreshToken);
            token = accessToken; // Use the new token
          } catch {
            // Refresh failed - clear tokens and let user login again
            clearTokens();
          }
        }
      }
      
      // If we have a valid token, fetch user data
      if (token) {
        try {
          const response = await apiClient.get<AuthUser>('/auth/me');
          setUser(transformAuthUser(response.data));
        } catch {
          // Token invalid or expired - clear it
          clearTokens();
        }
      }
      
      setIsInitialized(true);
    };

    void initAuth();
  }, []);

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
      setUser(transformAuthUser(authUser));

      return response.data;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      setUser(transformAuthUser(authUser));

      return response.data;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setUser(null);
    setError(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AuthUser>('/auth/me');
      const refreshedUser = transformAuthUser(response.data);
      setUser(refreshedUser);
      return refreshedUser;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Permission helpers
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return user?.permissions?.includes(permission) ?? false;
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user?.permissions) return false;
      return permissions.some((p) => user.permissions.includes(p));
    },
    [user],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user?.permissions) return false;
      return permissions.every((p) => user.permissions.includes(p));
    },
    [user],
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.roles?.includes(role) ?? false;
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user?.roles) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user],
  );

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
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
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
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
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
