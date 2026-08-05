'use client';

import { getRolePresentation } from '@tejas96/shared';
import { ChevronDown, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  Avatar,
  AvatarFallback,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

/**
 * Get primary role display name from canonical or legacy role codes.
 */
function getRoleDisplay(roles: string[]): string {
  const priority = [
    'super_admin',
    'platform_admin',
    'admin',
    'hr',
    'sales',
    'field_worker',
    'manager',
  ];

  for (const code of priority) {
    if (roles.includes(code)) {
      return getRolePresentation(code).label;
    }
  }

  if (roles.length > 0) {
    const firstRole = roles[0];
    if (firstRole) {
      return getRolePresentation(firstRole).label;
    }
  }

  return 'User';
}

interface UserMenuProps {
  className?: string;
}

/**
 * UserMenu - Profile dropdown in header
 * Features: User info, quick links, sign out
 * Note: Uses useRouter directly to avoid useSearchParams Suspense requirement
 */
export function UserMenu({ className }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Hydration safe - only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = useCallback((): void => {
    logout();
    // Use replace to prevent back button returning to protected pages
    router.replace(ROUTES.AUTH.LOGIN);
  }, [logout, router]);

  // Placeholder during SSR or no user
  if (!mounted || !user) {
    return (
      <Avatar size="sm" className={className}>
        <AvatarFallback>--</AvatarFallback>
      </Avatar>
    );
  }

  const userRole = getRoleDisplay(user.roles);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 rounded-full cursor-pointer',
            'hover:bg-muted transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            className,
          )}
          aria-label="User menu"
        >
          {/* Avatar */}
          <Avatar size="sm">
            <AvatarFallback>
              {getInitials(`${user.firstName} ${user.lastName ?? ''}`.trim())}
            </AvatarFallback>
          </Avatar>
          {/* Chevron - Desktop only */}
          <ChevronDown className="size-icon-xs text-foreground-tertiary hidden lg:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        {/* User Info Section */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            {/* Avatar */}
            <Avatar size="default">
              <AvatarFallback>
                {getInitials(`${user.firstName} ${user.lastName ?? ''}`.trim())}
              </AvatarFallback>
            </Avatar>
            {/* Name & Email */}
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium text-foreground">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-email-truncate">
                {user.email}
              </p>
              <Badge variant="default" size="xs">
                {userRole}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Quick Links */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={ROUTES.ACCOUNT.PROFILE}>
              <User className="mr-2" />
              <span>View Profile</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-error focus:text-error focus:bg-error/10"
        >
          <LogOut className="mr-2" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
