'use client';

import { Bell, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

import { cn } from '@/lib/utils';

interface GlobalHeaderProps {
  className?: string;
  onCommandOpen?: () => void;
}

/**
 * GlobalHeader - 48px fixed header component
 * Features: Logo, global search (Cmd+K), notifications, user menu, mobile nav
 * Reference: apps/ux/web/v2/dashboard/index.html
 */
export function GlobalHeader({ className, onCommandOpen }: GlobalHeaderProps) {
  const [notificationCount] = useState(3);

  // Keyboard shortcut for command palette
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCommandOpen?.();
      }
    },
    [onCommandOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'h-header bg-white border-b border-border-light',
        'flex items-center px-3 gap-3',
        className
      )}
    >
      {/* Mobile: Hamburger Menu */}
      <MobileNav />

      {/* Left: Logo */}
      <div className="flex items-center">
        <div className="flex items-baseline">
          <span className="text-xl font-semibold text-foreground">One</span>
          <span className="text-xl font-semibold text-primary">Ohm</span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 ml-3 lg:ml-6 mr-2 lg:mr-4">
        <button
          onClick={onCommandOpen}
          className={cn(
            'w-full max-w-md flex items-center space-x-2 lg:space-x-3',
            'px-3 py-1.5 bg-background-secondary hover:bg-background-tertiary',
            'rounded-lg border border-border-light',
            'transition-colors text-left'
          )}
        >
          <Search className="w-4 h-4 text-foreground-tertiary" />
          <span className="text-foreground-tertiary flex-1 text-sm hidden sm:inline">Search...</span>
          <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-medium text-foreground-tertiary bg-background border border-border-light rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1 lg:space-x-2">
        {/* Live Activity Indicator - Desktop only */}
        <div className="hidden xl:flex items-center space-x-2 text-sm text-muted-foreground mr-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>3 online</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 hover:bg-background-secondary rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          )}
        </button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}

export default GlobalHeader;
