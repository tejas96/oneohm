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
import { filterCanonicalRoles } from '@/lib/access-control/access';
import { useAuthStore } from '@/lib/stores/auth-store';
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

export type { ProfileSummary, User };

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

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
  refreshUserFromServer: () => Promise<User | null>;

  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function transformAuthUser(authUser: AuthUser): User {
  const primaryProfile = authUser.profiles?.find((p) => p.isPrimary);
  const firstProfileWithOrg = authUser.profiles?.find((p) => p.organizationId);
  const organizationId = primaryProfile?.organizationId ?? firstProfileWithOrg?.organizationId;
  const roles = filterCanonicalRoles(authUser.roles ?? []);

  return {
    id: authUser.id,
    email: authUser.email,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    fullName: authUser.fullName,
    phone: authUser.phone,
    roles,
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

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const storeLogout = useAuthStore((state) => state.logout);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRef = useRef(user);
  userRef.current = user;
  const initializingRef = useRef(false);

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
        setUser(transformAuthUser(authUser));

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
        setUser(transformAuthUser(authUser));

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
    apiClient.post('/auth/logout').catch(() => undefined);

    clearTokens();
    storeLogout();
    setError(null);
    queryClient.clear();
  }, [queryClient, storeLogout]);

  const refreshUserFromServer = useCallback(async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<AuthUser>('/auth/me');
      const refreshed = transformAuthUser(response.data);
      setUser(refreshed);
      return refreshed;
    } catch {
      return user;
    }
  }, [setUser, user]);

  const refreshUser = useCallback((): Promise<User | null> => {
    return refreshUserFromServer();
  }, [refreshUserFromServer]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'oneohm-auth') return;
      void refreshUserFromServer();
    };

    const handleFocus = () => {
      void refreshUserFromServer();
    };

    const handleAccessDenied = () => {
      void refreshUserFromServer();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('oneohm:access-denied', handleAccessDenied);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('oneohm:access-denied', handleAccessDenied);
    };
  }, [refreshUserFromServer]);

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
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      logout,
      clearError,
      refreshUser,
      refreshUserFromServer,
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
      requestPasswordResetOtp,
      verifyPasswordResetOtp,
      resetPassword,
      logout,
      clearError,
      refreshUser,
      refreshUserFromServer,
      storeHasRole,
      storeHasAnyRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useIsAdmin(): boolean {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(['admin', 'super_admin']);
}

export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
