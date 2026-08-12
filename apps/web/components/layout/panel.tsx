'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { useFollowupSummary } from '@/components/features/followups';
import { useMyTasksSummary } from '@/components/features/tasks';
import { Badge } from '@/components/ui/badge';
import { isAllProjectsNavActive, isProjectStatusSubItemActive, ROUTES } from '@/lib/config';
import { getFilteredPanelByPath, useFilteredNavigation, useRoutes } from '@/lib/hooks';
import type { NavItem, NavBadgeVariant, StatusDotColor } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

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
  overdue: 'bg-error',
  at_risk: 'bg-warning',
};

// Badge variant mapping
const BADGE_VARIANT_MAP: Record<
  NavBadgeVariant,
  'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
> = {
  default: 'secondary',
  primary: 'default',
  warning: 'warning',
  error: 'error',
  success: 'success',
  info: 'info',
};

/**
 * Panel - 200px collapsible sidebar
 * Features: Dynamic content based on rail selection, section headers, menu items
 * Supports sub-items with status dots and badge variants per UX spec
 * Uses filtered navigation based on user permissions and roles
 */
export function Panel({ isOpen, onClose, className }: PanelProps) {
  const { pathname, searchParams } = useRoutes();
  const { navigation } = useFilteredNavigation();
  const panelData = getFilteredPanelByPath(navigation, pathname);
  const isMyTasksPage = pathname === ROUTES.PROJECTS.MY_TASKS;
  const { data: tasksSummary } = useMyTasksSummary({ enabled: !isMyTasksPage });
  const { data: followupSummary } = useFollowupSummary(true);

  const dynamicBadges = useMemo<
    Record<string, { value: number | string; variant?: NavBadgeVariant }>
  >(() => {
    const badges: Record<string, { value: number | string; variant?: NavBadgeVariant }> = {};
    if (tasksSummary && tasksSummary.total > 0) {
      badges['projects-my-tasks'] = {
        value: tasksSummary.total,
        variant: tasksSummary.overdue > 0 ? 'error' : undefined,
      };
    }
    // Overdue + due today: the work someone owes right now. Red only when
    // something is actually late, matching how My Tasks already reads.
    const followupsDue = (followupSummary?.overdue ?? 0) + (followupSummary?.today ?? 0);
    if (followupsDue > 0) {
      badges['followups'] = {
        value: followupsDue,
        variant: (followupSummary?.overdue ?? 0) > 0 ? 'error' : undefined,
      };
    }
    return badges;
  }, [tasksSummary, followupSummary]);

  // Build current full URL for comparison (pathname + search params)
  const searchString = searchParams.toString();
  const currentFullUrl = searchString ? `${pathname}?${searchString}` : pathname;

  // If no panel config available (user doesn't have access), don't render
  if (!panelData) {
    return null;
  }

  const { config } = panelData;

  // Render a single nav item (supports both regular items and sub-items)
  const renderNavItem = (item: NavItem, isSubItem = false) => {
    // Determine active state using proper matching logic:
    // 1. Items with query params → exact full URL match only
    // 2. Items with exactMatch: true → exact pathname match only
    // 3. Items that are dynamic route TARGETS (like /customers/[id]) → match dynamic segments
    // 4. List items → exact match OR nested dynamic routes (NOT sibling routes)
    const hasQueryParams = item.href.includes('?');

    let isActive = false;

    if (hasQueryParams) {
      // Filtered views: exact full URL match only
      if (item.href.startsWith('/projects')) {
        isActive = isProjectStatusSubItemActive(pathname, item.href, searchParams);
      } else {
        isActive = currentFullUrl === item.href;
      }
    } else if (item.exactMatch) {
      // Explicit exact match (for action items like "Add Customer")
      isActive = pathname === item.href;
    } else {
      // List items: active if exact match OR viewing a DETAIL page (dynamic ID)
      // NOT active for sibling static routes like /customers/new
      const isExact = pathname === item.href && !searchString;

      // Check if we're on a nested route that should highlight this item
      // Only match if the segment after the base is a dynamic ID (not a static route)
      // Dynamic IDs are typically UUIDs or numeric IDs, not words like "new", "edit"
      let isNestedDynamic = false;
      if (pathname.startsWith(`${item.href}/`)) {
        const remainder = pathname.slice(item.href.length + 1); // Get part after base/
        const nextSegment = remainder.split('/')[0] ?? '';
        // Consider it a dynamic route if the segment looks like an ID (UUID or number)
        // Static routes like "new", "edit", "settings" should NOT match
        const isLikelyDynamicId = /^[0-9a-f-]{8,}$/i.test(nextSegment) || /^\d+$/.test(nextSegment);
        isNestedDynamic = isLikelyDynamicId;
      }

      if (item.id === 'all-projects') {
        isActive = isAllProjectsNavActive(pathname, item.href, searchParams) || isNestedDynamic;
      } else {
        isActive = isExact || isNestedDynamic;
      }
    }

    const Icon = item.icon;
    const dynamicBadge = dynamicBadges[item.id];
    const displayBadge = item.badge ?? dynamicBadge?.value;
    const resolvedBadgeVariant = dynamicBadge?.variant ?? item.badgeVariant;
    const badgeVariant = resolvedBadgeVariant
      ? BADGE_VARIANT_MAP[resolvedBadgeVariant]
      : 'secondary';

    return (
      <Link
        key={item.id}
        href={item.href}
        prefetch={false}
        className={cn(
          'panel-item',
          isActive && 'active',
          item.disabled && 'opacity-50 pointer-events-none',
          isSubItem && 'sub-item',
        )}
        aria-disabled={item.disabled}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noopener noreferrer' : undefined}
      >
        {/* Status dot (for lead temperature) - 8px for better visibility */}
        {item.statusDot && (
          <span
            className={cn('size-2 rounded-full mr-2 shrink-0', STATUS_DOT_COLORS[item.statusDot])}
          />
        )}

        {/* Icon (for regular items without status dot) */}
        {!item.statusDot && Icon && <Icon className="size-icon-sm mr-2.5 shrink-0" />}

        <span className="flex-1 truncate">{item.label}</span>

        {/* Badge with variant (static or dynamic) */}
        {displayBadge !== undefined && (
          <Badge variant={badgeVariant} size="xs" className="ml-2">
            {displayBadge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'fixed top-header left-rail z-35',
        'w-panel h-[calc(100vh-var(--header-height))]',
        'bg-white border-r border-border-light',
        'flex flex-col',
        'transition-all duration-200 ease-out',
        // Hide on mobile
        'hidden lg:flex',
        isOpen
          ? 'translate-x-0 opacity-100'
          : '-translate-x-content-offset opacity-0 pointer-events-none',
        className,
      )}
    >
      {/* Panel Header - 48px per UX spec */}
      <div className="h-header px-4 flex items-center justify-between shrink-0">
        <span className="text-base font-semibold text-foreground">{config.title}</span>
        <button
          onClick={onClose}
          className="size-7 flex items-center justify-center text-foreground-tertiary rounded-md cursor-pointer hover:bg-muted hover:text-foreground-secondary transition-all"
          title="Close panel (⌘\)"
          aria-label="Close panel"
        >
          <ChevronLeft className="size-icon-sm" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {config.sections.map((section) => (
          <div key={section.title} className="px-2 mb-2">
            {/* Section Header */}
            <div className="panel-section-header">{section.title}</div>

            {/* Section Items */}
            {section.items.map((item) => (
              <div key={item.id}>
                {renderNavItem(item)}
                {/* Render sub-items if present */}
                {item.children?.map((child) => renderNavItem(child, true))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Panel;
