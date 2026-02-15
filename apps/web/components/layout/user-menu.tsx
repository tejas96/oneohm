'use client';

import { ChevronDown, LogOut, Moon, Settings, Sun, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

/**
 * Get user initials from name
 */
function getInitials(firstName: string, lastName?: string): string {
  if (lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  return firstName.slice(0, 2).toUpperCase();
}

/**
 * Get primary role display name
 */
function getRoleDisplay(roles: string[]): string {
  if (roles.includes('super_admin') || roles.includes('platform_admin')) return 'Super Admin';
  if (roles.includes('admin')) return 'Admin';
  if (roles.includes('manager')) return 'Manager';
  if (roles.includes('sales')) return 'Sales';
  if (roles.includes('field_worker')) return 'Field Worker';
  return 'User';
}

interface UserMenuProps {
  className?: string;
}

/**
 * UserMenu - Profile dropdown in header
 * Features: User info, quick links, theme toggle, sign out
 * Note: Uses useRouter directly to avoid useSearchParams Suspense requirement
 */
export function UserMenu({ className }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Hydration safe - only render after mount
  useEffect(() => {
    setMounted(true);
    // Check system preference or stored preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    setIsDark(storedTheme === 'dark' || (!storedTheme && prefersDark));
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

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
            'flex items-center gap-1.5 rounded-full',
            'hover:bg-muted transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            className
          )}
          aria-label="User menu"
        >
          {/* Avatar */}
          <Avatar size="sm">
            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
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
              <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            {/* Name & Email */}
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {user.fullName}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-email-truncate">
                {user.email}
              </p>
              <Badge variant="default" size="xs">{userRole}</Badge>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Quick Links */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profile">
              <User className="mr-2" />
              <span>View Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/settings">
              <Settings className="mr-2" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Theme Toggle */}
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
          {isDark ? (
            <>
              <Sun className="mr-2" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="mr-2" />
              <span>Dark Mode</span>
            </>
          )}
        </DropdownMenuItem>

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
