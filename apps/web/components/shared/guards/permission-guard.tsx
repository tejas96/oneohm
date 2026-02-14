'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { AuthGuard } from './auth-guard';

import { useAuth } from '@/providers/auth-provider';

interface PermissionGuardProps {
  children: ReactNode;
  /** URL to redirect to if not authenticated */
  redirectTo?: string;
  /** Optional loading component */
  fallback?: ReactNode;
  /** Required permission to access this route */
  permission?: string;
  /** Required role to access this route */
  role?: string;
  /** Component to show if user doesn't have permission */
  forbidden?: ReactNode;
}

/**
 * Permission Guard Component
 * Wraps AuthGuard and also checks for specific permissions or roles.
 */
export function PermissionGuard({
  children,
  permission,
  role,
  forbidden,
  ...authGuardProps
}: PermissionGuardProps): React.JSX.Element | null {
  return (
    <AuthGuard {...authGuardProps}>
      <PermissionCheck permission={permission} role={role} forbidden={forbidden}>
        {children}
      </PermissionCheck>
    </AuthGuard>
  );
}

/**
 * Internal component for permission/role checking
 */
function PermissionCheck({
  children,
  permission,
  role,
  forbidden,
}: {
  children: ReactNode;
  permission?: string;
  role?: string;
  forbidden?: ReactNode;
}): React.JSX.Element | null {
  const { hasPermission, hasRole } = useAuth();

  // Check permission
  if (permission && !hasPermission(permission)) {
    return <>{forbidden || <ForbiddenScreen message="You don't have permission to access this page." />}</>;
  }

  // Check role
  if (role && !hasRole(role)) {
    return (
      <>
        {forbidden || <ForbiddenScreen message={`You need the "${role}" role to access this page.`} />}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Default forbidden screen
 */
function ForbiddenScreen({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary">
      <div className="text-center max-w-md px-4">
        <div className="size-container-xl mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
          <AlertTriangle className="size-icon-xl text-error" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-foreground-secondary text-sm">{message}</p>
      </div>
    </div>
  );
}
