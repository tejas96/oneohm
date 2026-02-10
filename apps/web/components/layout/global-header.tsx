'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';

import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

import { SearchTrigger } from '@/components/shared/search';
import { DotBadge } from '@/components/ui/badge';
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

  // Note: Keyboard shortcut (⌘K) is handled by SearchTrigger component

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
        <SearchTrigger
          onClick={() => onCommandOpen?.()}
          className="w-full max-w-md"
          placeholder="Search..."
          shortcut="⌘K"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1 lg:space-x-2">
        {/* Live Activity Indicator - Desktop only */}
        <div className="hidden xl:flex items-center mr-2">
          <DotBadge color="green">3 online</DotBadge>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 hover:bg-background-secondary rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-icon-md text-muted-foreground" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 bg-error rounded-full" />
          )}
        </button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}

export default GlobalHeader;
