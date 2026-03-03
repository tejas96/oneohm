'use client';

import { cn } from '@/lib/utils';

interface MainContentProps {
  isPanelOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * MainContent - Content wrapper with responsive margins
 * - Mobile (< lg): No left margin (full width)
 * - Desktop (lg+): Margin based on panel open/closed state
 * Reference: apps/ux/web/v2/dashboard/index.html
 */
export function MainContent({ isPanelOpen, children, className }: MainContentProps) {
  return (
    <main
      className={cn(
        'min-h-[calc(100vh-var(--header-height))]',
        'mt-header bg-background-tertiary',
        'transition-all duration-200 ease-out',
        // Mobile: no left margin
        'ml-0',
        // Desktop: margin based on panel state (rail: 48px, panel: 200px)
        isPanelOpen ? 'lg:ml-content-offset' : 'lg:ml-rail',
        className,
      )}
    >
      {/* p-5 (20px) per UX STYLE-GUIDE.md */}
      <div className="p-4 lg:p-5">{children}</div>
    </main>
  );
}

export default MainContent;
