'use client';

import type { ReactNode } from 'react';

import { useAuth } from '@/providers/auth-provider';

interface CanProps {
  /** Single permission code or array of codes */
  permission: string | string[];
  /** When true, require ALL permissions (default: any-of) */
  all?: boolean;
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Content to render when permission is denied (default: null / hidden) */
  fallback?: ReactNode;
  /** When true, render children with a blur overlay instead of hiding */
  blur?: boolean;
}

/**
 * Declarative inline permission gate.
 *
 * Hides (or blurs/replaces) children based on the current user's permissions.
 * Wraps `useAuth().hasPermission` so the rest of the RBAC infrastructure
 * (JWT -> Zustand -> AuthProvider) is reused without any new plumbing.
 *
 * @example
 * // Hide entirely when no permission
 * <Can permission="quotes:view_price_breakdown">
 *   <PricingSummary />
 * </Can>
 *
 * // Show blurred placeholder
 * <Can permission="quotes:view_price_breakdown" blur>
 *   <PricingSection />
 * </Can>
 *
 * // Show fallback when denied
 * <Can permission="customers:assign" fallback={<span>Not authorized</span>}>
 *   <AssigneeSelector />
 * </Can>
 */
export function Can({
  permission,
  all = false,
  children,
  fallback = null,
  blur = false,
}: CanProps): React.JSX.Element | null {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  const codes = Array.isArray(permission) ? permission : [permission];

  const granted =
    codes.length === 1
      ? hasPermission(codes[0]!)
      : all
        ? hasAllPermissions(codes)
        : hasAnyPermission(codes);

  if (granted) {
    return <>{children}</>;
  }

  if (blur) {
    return (
      <div className="relative select-none" aria-hidden="true">
        <div className="pointer-events-none blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground-secondary backdrop-blur-sm">
            Restricted
          </span>
        </div>
      </div>
    );
  }

  return <>{fallback}</>;
}
