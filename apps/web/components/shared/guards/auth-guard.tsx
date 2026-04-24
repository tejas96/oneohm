'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { ZigzagLoader } from '@/components/ui/zigzag-loader';
import { ROUTES } from '@/lib/config/routes';
import { useAuth } from '@/providers/auth-provider';

interface AuthGuardProps {
  children: ReactNode;
  /** URL to redirect to if not authenticated */
  redirectTo?: string;
  /** Optional loading component */
  fallback?: ReactNode;
}

/**
 * Auth Guard Component
 * Protects routes that require authentication.
 * Uses AuthProvider's isInitialized to handle hydration properly.
 * Note: Uses useRouter directly to avoid useSearchParams Suspense requirement
 */
export function AuthGuard({
  children,
  redirectTo = ROUTES.AUTH.LOGIN,
  fallback,
}: AuthGuardProps): React.JSX.Element | null {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to initialize before checking
    if (!isInitialized) return;

    // If not authenticated, redirect (use replace to prevent back button issues)
    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      const redirectUrl =
        currentPath !== '/'
          ? `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
          : redirectTo;
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, isInitialized, router, redirectTo]);

  // Show fallback while initializing or not authenticated
  if (!isInitialized || !isAuthenticated) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-background-secondary">
            <ZigzagLoader
              staticMessage={isInitialized && !isAuthenticated ? 'Logging out…' : undefined}
            />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
