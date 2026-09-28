'use client';

import { usePathname } from 'next/navigation';
import React, { Suspense, useState, type ReactNode } from 'react';

import {
  GlobalHeader,
  LayoutProvider,
  MainContent,
  PageTransitionGuard,
  Panel,
  Rail,
  useLayout,
} from '@/components/layout';
import { CommandPalette } from '@/components/shared/command-palette';
import { AuthGuard } from '@/components/shared/guards';
import { AccessDeniedContent, AccessDialogProvider, useCan } from '@/lib/rbac';
import { gateForPath } from '@/lib/rbac/route-map';
import { useAuth } from '@/providers/auth-provider';

interface DashboardLayoutContentProps {
  children: ReactNode;
}

/**
 * Dashboard Layout Content
 * Uses layout context for panel state management
 */
function DashboardLayoutContent({ children }: DashboardLayoutContentProps) {
  const { isPanelOpen, togglePanel } = useLayout();
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <>
      {/* Global Header - 48px fixed */}
      <GlobalHeader onCommandOpen={() => setCommandOpen((prev) => !prev)} />

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Rail - 48px icon navigation */}
      <Rail isPanelOpen={isPanelOpen} onTogglePanel={togglePanel} />

      {/* Panel - 200px collapsible sidebar (Suspense required for useSearchParams) */}
      <Suspense fallback={null}>
        <Panel isOpen={isPanelOpen} onClose={togglePanel} />
      </Suspense>

      {/* Main Content - Responsive margins */}
      <MainContent isPanelOpen={isPanelOpen}>
        <PageTransitionGuard>
          <RouteGate>{children}</RouteGate>
        </PageTransitionGuard>
      </MainContent>
    </>
  );
}

/**
 * Client-side half of route gating.
 *
 * `middleware.ts` already blocks blocked URLs server-side. This covers soft
 * navigation and the moment after a token refresh changes what someone holds.
 *
 * It renders the deny screen **instead of** `children`, which is the point:
 * the page component never mounts, so none of its data hooks fire and no API
 * request goes out for data the user should not see.
 */
function RouteGate({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const { can } = useCan();
  const gate = gateForPath(pathname);
  const { user } = useAuth();
  const isResellerOnly =
    Boolean(user?.profiles?.length) && user!.profiles.every((p) => p.type === 'reseller');

  if (isResellerOnly) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-1 text-xl font-semibold text-foreground">Use the OneOhm EPC app</h2>
          <p className="text-sm text-foreground-secondary">
            Your leads, quotes and earnings are in the mobile app. The web portal is for the office
            team.
          </p>
        </div>
      </div>
    );
  }

  if (!can(gate)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <AccessDeniedContent gate={gate} />
      </div>
    );
  }

  return <>{children}</>;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard Layout
 * V2 Design System - Rail + Panel layout structure
 * Reference: apps/ux/web/v2/dashboard/index.html
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  return (
    <AuthGuard>
      <AccessDialogProvider>
        <LayoutProvider>
          <div className="min-h-screen bg-background-secondary">
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
          </div>
        </LayoutProvider>
      </AccessDialogProvider>
    </AuthGuard>
  );
}
