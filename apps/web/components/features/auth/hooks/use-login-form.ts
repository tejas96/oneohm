'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { loginSchema, type LoginFormData } from '../schemas/auth.schema';

import { ROUTES, useRoutes } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';

export interface UseLoginFormReturn {
  isLoading: boolean;
  displayError: string | null | undefined;
  passwordForm: UseFormReturn<LoginFormData>;
  onPasswordSubmit: (e?: React.BaseSyntheticEvent) => void;
}

export function useLoginForm(): UseLoginFormReturn {
  const { router, getQueryParam } = useRoutes();
  const { login, isLoading, error, isAuthenticated, isInitialized } = useAuth();

  const passwordForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const redirectTo = getQueryParam('redirect') || ROUTES.HOME;
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isInitialized, router, getQueryParam]);

  const handlePasswordSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        await login({ email: data.email, password: data.password });
      } catch {
        // Error handled by auth context
      }
    },
    [login],
  );

  const onPasswordSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => {
      void passwordForm.handleSubmit(handlePasswordSubmit)(e);
    },
    [passwordForm, handlePasswordSubmit],
  );

  const displayError = error ?? passwordForm.formState.errors.root?.message;

  return {
    isLoading,
    displayError,
    passwordForm,
    onPasswordSubmit,
  };
}
