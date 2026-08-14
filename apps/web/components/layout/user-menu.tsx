'use client';

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
 * Label for the user's role(s).
 *
 * Deliberately not a hardcoded lookup table: a superadmin can invent role
 * names at runtime, so any fixed list would show "User" for roles this build
 * has never heard of. Titlecase the code instead, and count when there are
 * several rather than picking a winner.
 */
function getRoleDisplay(roles: string[]): string {
  const named = roles.filter((r) => r !== 'customer');
  if (named.length === 0) return 'User';
  if (named.length > 1) return `${named.length} roles`;

  return named[0]!
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
