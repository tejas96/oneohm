'use client';

import React, { type ReactNode } from 'react';
import {
  GlobalHeader,
  Rail,
  Panel,
  MainContent,
  LayoutProvider,
  useLayout,
} from '@/components/layout';

interface DashboardLayoutContentProps {
  children: ReactNode;
}

/**
 * Dashboard Layout Content
 * Uses layout context for panel state management
 */
function DashboardLayoutContent({ children }: DashboardLayoutContentProps) {
  const { isPanelOpen, togglePanel } = useLayout();

  return (
    <>
      {/* Global Header - 48px fixed */}
      <GlobalHeader />

      {/* Rail - 48px icon navigation */}
      <Rail isPanelOpen={isPanelOpen} onTogglePanel={togglePanel} />

      {/* Panel - 200px collapsible sidebar */}
      <Panel isOpen={isPanelOpen} onClose={togglePanel} />

      {/* Main Content - Responsive margins */}
      <MainContent isPanelOpen={isPanelOpen}>
        {children}
      </MainContent>
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
    <LayoutProvider>
      <div className="min-h-screen bg-background-secondary">
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </div>
    </LayoutProvider>
  );
}
