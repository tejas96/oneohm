'use client';

import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';

import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

import { SearchTrigger } from '@/components/shared/search';
import { showFeatureAccessDenied } from '@/lib/access-control/access-feedback';
import { useFeatureAccess } from '@/lib/hooks/use-feature-access';
import { useNotificationUnreadCount } from '@/lib/hooks/resources/notifications';
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
  const router = useRouter();
  const canViewNotifications = useFeatureAccess('notifications.view');
  const { data: unreadData } = useNotificationUnreadCount({
    enabled: canViewNotifications,
  });
  const unreadCount = unreadData?.count ?? 0;

  const handleNotificationsClick = () => {
    if (!canViewNotifications) {
      showFeatureAccessDenied({ feature: 'notifications.view', label: 'Notifications' });
      return;
    }
    router.push('/notifications');
  };

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
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            size="small"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            onClick={handleNotificationsClick}
            sx={{ borderRadius: '8px' }}
          >
            <Badge
              badgeContent={unreadCount > 0 ? unreadCount : undefined}
              color="error"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
            >
              <NotificationsIcon sx={{ fontSize: 20, color: 'var(--color-muted-foreground)' }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}

export default GlobalHeader;
