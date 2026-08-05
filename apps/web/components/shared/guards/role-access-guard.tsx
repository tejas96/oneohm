'use client';

import { ShieldX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { canAccessFeature } from '@/lib/access-control/access';
import { getRouteAccess } from '@/lib/access-control/route-policy';
import { useAuthStore } from '@/lib/stores/auth-store';

interface RoleAccessGuardProps {
  children: ReactNode;
}

export function RoleAccessGuard({ children }: RoleAccessGuardProps): React.JSX.Element {
  const pathname = usePathname() ?? '/';
  const roles = useAuthStore((state) => state.user?.roles ?? []);

  const routeAccess = getRouteAccess(pathname);

  if (!routeAccess.isRegistered) {
    return <AccessDeniedPage reason="This route is not registered in the access policy." />;
  }

  if (!routeAccess.isImplemented) {
    return <AccessDeniedPage reason="This page is not available yet." />;
  }

  if (!routeAccess.feature || !canAccessFeature(roles, routeAccess.feature)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}

function AccessDeniedPage({ reason }: { reason?: string }): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {reason ??
          'Your assigned roles do not allow this page. Contact a Superadmin if you need access.'}
      </p>
    </div>
  );
}
