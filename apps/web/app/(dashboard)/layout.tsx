'use client';

import React, { Suspense, useState, type ReactNode } from 'react';

import {
  GlobalHeader,
  LayoutProvider,
  MainContent,
  Panel,
  Rail,
  useLayout,
} from '@/components/layout';
import { CommandPalette } from '@/components/shared/command-palette';
import { AuthGuard } from '@/components/shared/guards';

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
      <MainContent isPanelOpen={isPanelOpen}>{children}</MainContent>
    </>
  );
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
      <LayoutProvider>
        <div className="min-h-screen bg-background-secondary">
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </div>
      </LayoutProvider>
    </AuthGuard>
  );
}
