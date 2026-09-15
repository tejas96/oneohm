'use client';

import { MobileNav } from './mobile-nav';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';

import { SearchTrigger } from '@/components/shared/search';
import { cn } from '@/lib/utils';

interface GlobalHeaderProps {
  className?: string;
  onCommandOpen?: () => void;
}

/**
 * GlobalHeader - 48px fixed header component
 * Features: Logo, global search (Cmd+K), notifications bell with live unread count, user menu, mobile nav
 */
export function GlobalHeader({ className, onCommandOpen }: GlobalHeaderProps) {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'h-header bg-white border-b border-border-light',
        'flex items-center px-3 gap-3',
        className,
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
        {/* Your own notifications. Nothing to gate: they were sent to you. */}
        <NotificationBell />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
