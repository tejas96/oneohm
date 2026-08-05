'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { GuardedNavLink } from '@/components/layout/guarded-nav-link';
import { CountBadge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isNavItemActive } from '@/lib/config';
import { useFilteredNavigation } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface RailProps {
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  className?: string;
}

export function Rail({ isPanelOpen, onTogglePanel, className }: RailProps) {
  const pathname = usePathname();
  const { navigation } = useFilteredNavigation();

  const renderRailItem = (item: (typeof navigation.railTop)[number]) => {
    const isActive = isNavItemActive(pathname, item.href, item.panelKey);
    const Icon = item.icon;

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <GuardedNavLink
            href={item.href}
            label={item.label}
            feature={item.feature}
            isAllowed={item.isAllowed ?? true}
            prefetch={false}
            className={cn(
              'rail-icon',
              isActive && 'active',
              item.disabled && 'opacity-50 pointer-events-none',
            )}
          >
            {Icon && <Icon className="size-icon" strokeWidth={2} />}
            {typeof item.badge === 'number' && (
              <CountBadge
                count={item.badge}
                variant="primary"
                size="2xs"
                className="absolute top-0.5 right-0.5"
              />
            )}
          </GuardedNavLink>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'fixed top-header left-0 z-40',
          'w-rail h-[calc(100vh-var(--header-height))]',
          'bg-white border-r border-border-light',
          'flex flex-col',
          'hidden lg:flex',
          className,
        )}
      >
        <nav className="flex-1 flex flex-col pt-1.5">
          {navigation.railTop.map(renderRailItem)}
        </nav>

        <div className="pb-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onTogglePanel}
                className="rail-icon w-full"
                aria-label={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
              >
                {isPanelOpen ? (
                  <ChevronsLeft className="size-icon" strokeWidth={2} />
                ) : (
                  <ChevronsRight className="size-icon" strokeWidth={2} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {isPanelOpen ? 'Collapse panel' : 'Expand panel'} (⌘\)
            </TooltipContent>
          </Tooltip>

          {navigation.railBottom.map(renderRailItem)}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Rail;
