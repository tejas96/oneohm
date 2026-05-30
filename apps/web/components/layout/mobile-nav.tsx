'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge, CountBadge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { isNavItemActive } from '@/lib/config';
import { getFilteredPanelByPath, useFilteredNavigation, useRoutes } from '@/lib/hooks';
import type { NavItem, StatusDotColor } from '@/lib/types';
import { cn } from '@/lib/utils';

// Status dot color mapping
const STATUS_DOT_COLORS: Record<StatusDotColor, string> = {
  hot: 'bg-error',
  warm: 'bg-warning',
  cold: 'bg-info',
  active: 'bg-success',
  planning: 'bg-info',
  on_hold: 'bg-warning',
  completed_project: 'bg-foreground-tertiary',
  cancelled: 'bg-error',
};

/**
 * MobileNav - Mobile navigation drawer
 * Shows hamburger menu on mobile, opens sheet with full navigation
 * Uses mounted check to avoid hydration mismatch with Radix UI
 */
export function MobileNav() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { pathname, searchParams } = useRoutes();
  const { navigation } = useFilteredNavigation();
  const panelData = getFilteredPanelByPath(navigation, pathname);

  // Ensure consistent hydration - only render Sheet after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const closeNav = () => setIsOpen(false);

  // Render placeholder button during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="size-icon-md text-foreground-secondary" />
      </button>
    );
  }

  const panelConfig = panelData?.config;
  const searchString = searchParams.toString();
  const currentFullUrl = searchString ? `${pathname}?${searchString}` : pathname;

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const hasQueryParams = item.href.includes('?');
    let isActive = false;

    if (hasQueryParams) {
      // Exact full URL matching or query parameters extraction
      if (item.href.startsWith('/projects')) {
        const urlObj = new URL(item.href, 'http://localhost');
        const targetStatus = urlObj.searchParams.get('status');

        let currentStatus = searchParams.get('status');
        if (!currentStatus) {
          const prefFilters = searchParams.get('projects_filters');
          if (prefFilters) {
            try {
              const parsedFilters = JSON.parse(prefFilters);
              currentStatus = parsedFilters.status;
            } catch (error) {
              console.log(error);
            }
          }
        }
        if (!currentStatus && targetStatus === 'active') {
          isActive = true;
        } else {
          isActive = currentStatus === targetStatus;
        }
      } else {
        isActive = currentFullUrl === item.href;
      }
    } else if (item.exactMatch) {
      isActive = pathname === item.href;
    } else {
      const isExact = pathname === item.href && !searchString;
      let isNestedDynamic = false;
      if (pathname.startsWith(`${item.href}/`)) {
        const remainder = pathname.slice(item.href.length + 1);
        const nextSegment = remainder.split('/')[0] ?? '';
        const isLikelyDynamicId = /^[0-9a-f-]{8,}$/i.test(nextSegment) || /^\d+$/.test(nextSegment);
        isNestedDynamic = isLikelyDynamicId;
      }
      isActive = isExact || isNestedDynamic;
    }

    const Icon = item.icon;
    const displayBadge = item.badge;

    return (
      <Link
        key={item.id}
        href={item.href}
        prefetch={false}
        onClick={closeNav}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-foreground-secondary hover:bg-muted',
          isSubItem && 'pl-9 text-xs py-1.5',
        )}
      >
        {item.statusDot && (
          <span
            className={cn('size-2 rounded-full mr-1.5 shrink-0', STATUS_DOT_COLORS[item.statusDot])}
          />
        )}
        {!item.statusDot && Icon && <Icon className="size-icon shrink-0" />}
        <span className="flex-1 truncate">{item.label}</span>
        {displayBadge !== undefined && (
          <Badge variant="secondary" size="sm">
            {displayBadge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="size-icon-md text-foreground-secondary" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-sheet-mobile p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border-light">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-baseline">
              <span className="text-lg font-semibold text-foreground">One</span>
              <span className="text-lg font-semibold text-primary">Ohm</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Main Navigation */}
        <div className="flex flex-col h-[calc(100vh-var(--header-height))] overflow-y-auto">
          {/* Rail Items as Primary Nav */}
          <div className="p-2 border-b border-border-light shrink-0">
            <div className="text-2xs font-semibold text-foreground-tertiary uppercase tracking-wide px-3 py-2">
              Navigation
            </div>
            {navigation.railTop.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onClick={closeNav}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                    'transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground-secondary hover:bg-muted',
                  )}
                >
                  {Icon && <Icon className="size-icon-md" strokeWidth={2} />}
                  <span className="flex-1">{item.label}</span>
                  {typeof item.badge === 'number' && (
                    <CountBadge count={item.badge} variant="error" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Current Section Sub-Navigation */}
          {panelConfig && (
            <div className="p-2 border-b border-border-light shrink-0">
              <div className="text-2xs font-semibold text-foreground-tertiary uppercase tracking-wide px-3 py-2">
                {panelConfig.title}
              </div>
              {panelConfig.sections.map((section) => (
                <div key={section.title} className="mb-3">
                  <div className="text-2xs font-medium text-foreground-tertiary px-3 py-1">
                    {section.title}
                  </div>
                  {section.items.map((item) => (
                    <div key={item.id}>
                      {renderNavItem(item)}
                      {item.children?.map((child) => renderNavItem(child, true))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Nav */}
          <div className="p-2 mt-auto border-t border-border-light shrink-0">
            {navigation.railBottom.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onClick={closeNav}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                    'transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground-secondary hover:bg-muted',
                  )}
                >
                  {Icon && <Icon className="size-icon-md" strokeWidth={2} />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNav;
