'use client';

import { LogOut, Settings, User, Moon, Sun, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Mock user data - replace with actual auth context when available
 * TODO: Connect to auth context (e.g., next-auth, clerk, or custom)
 */
const mockUser = {
  firstName: 'Tejas',
  lastName: 'Patil',
  email: 'tejas@oneohm.in',
  role: 'Admin',
  avatarUrl: null as string | null,
};

/**
 * Get user initials from name
 */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface UserMenuProps {
  className?: string;
}

/**
 * UserMenu - Profile dropdown in header
 * Features: User info, quick links, theme toggle, sign out
 */
export function UserMenu({ className }: UserMenuProps) {
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

  const handleSignOut = () => {
    // TODO: Implement actual sign out logic
    console.log('Sign out clicked');
  };

  // Placeholder during SSR
  if (!mounted) {
    return (
      <button
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full',
          'bg-primary/20 text-primary text-sm font-semibold',
          className
        )}
        aria-label="User menu"
      >
        {getInitials(mockUser.firstName, mockUser.lastName)}
      </button>
    );
  }

  return (
    <DropdownMenu>
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
          {mockUser.avatarUrl ? (
            <img
              src={mockUser.avatarUrl}
              alt={`${mockUser.firstName} ${mockUser.lastName}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-semibold">
              {getInitials(mockUser.firstName, mockUser.lastName)}
            </div>
          )}
          {/* Chevron - Desktop only */}
          <ChevronDown className="w-3.5 h-3.5 text-foreground-tertiary hidden lg:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        {/* User Info Section */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            {/* Avatar */}
            {mockUser.avatarUrl ? (
              <img
                src={mockUser.avatarUrl}
                alt={`${mockUser.firstName} ${mockUser.lastName}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-semibold">
                {getInitials(mockUser.firstName, mockUser.lastName)}
              </div>
            )}
            {/* Name & Email */}
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {mockUser.firstName} {mockUser.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {mockUser.email}
              </p>
              <span className="inline-flex items-center px-1.5 py-0.5 text-2xs font-medium bg-primary/10 text-primary rounded w-fit">
                {mockUser.role}
              </span>
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
