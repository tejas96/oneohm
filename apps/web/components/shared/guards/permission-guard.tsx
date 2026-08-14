'use client';

import type { ReactNode } from 'react';

import { AuthGuard } from './auth-guard';

import { AccessDeniedContent, useCan, type Gate } from '@/lib/rbac';

interface PermissionGuardProps {
  children: ReactNode;
  /** URL to redirect to if not authenticated */
  redirectTo?: string;
  /** Optional loading component */
  fallback?: ReactNode;
  /** Gate required to view this page */
  permission: Gate;
  /** Component to show when the gate is closed */
  forbidden?: ReactNode;
}

/**
 * Page-level gate.
 *
 * Wraps AuthGuard and additionally checks one gate. The `role` prop this used
 * to accept is gone — roles are created at runtime by the superadmin now, so
 * hardcoding a role name in a component would break the moment someone
 * renamed it. Gate on a permission code instead; `SUPERADMIN_ONLY` covers the
 * one case that genuinely is role-shaped.
 */
export function PermissionGuard({
  children,
  permission,
  forbidden,
  ...authGuardProps
}: PermissionGuardProps): React.JSX.Element | null {
  return (
    <AuthGuard {...authGuardProps}>
      <PermissionCheck permission={permission} forbidden={forbidden}>
        {children}
      </PermissionCheck>
    </AuthGuard>
  );
}

function PermissionCheck({
  children,
  permission,
  forbidden,
}: {
  children: ReactNode;
  permission: Gate;
  forbidden?: ReactNode;
}): React.JSX.Element | null {
  const { can } = useCan();

  if (!can(permission)) {
    return (
      <>
        {forbidden ?? (
          <div className="min-h-screen flex items-center justify-center bg-background-secondary px-4">
            <AccessDeniedContent gate={permission} />
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
