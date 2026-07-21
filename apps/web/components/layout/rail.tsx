'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

/**
 * Rail - 48px fixed icon navigation strip
 * Features: Icon buttons with tooltips, active state, notification badges
 * Uses filtered navigation based on user permissions and roles
 * Note: Uses usePathname directly to avoid useSearchParams Suspense requirement
 */
export function Rail({ isPanelOpen, onTogglePanel, className }: RailProps) {
  const pathname = usePathname();
  const { navigation } = useFilteredNavigation();

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'fixed top-header left-0 z-40',
          'w-rail h-[calc(100vh-var(--header-height))]',
          'bg-white border-r border-border-light',
          'flex flex-col',
          // Hide on mobile, show on lg and above
          'hidden lg:flex',
          className,
        )}
      >
        {/* Top Navigation */}
        <nav className="flex-1 flex flex-col pt-1.5">
          {navigation.railTop.map((item) => {
            // Pass panelKey for accurate active state (e.g., /properties shows CRM as active)
            const isActive = isNavItemActive(pathname, item.href, item.panelKey);
            const Icon = item.icon;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      'rail-icon',
                      isActive && 'active',
                      item.disabled && 'opacity-50 pointer-events-none',
                    )}
                    aria-disabled={item.disabled}
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
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="pb-1.5">
          {/* Panel Toggle */}
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

          {/* Bottom Nav Items */}
          {navigation.railBottom.map((item) => {
            // Pass panelKey for accurate active state
            const isActive = isNavItemActive(pathname, item.href, item.panelKey);
            const Icon = item.icon;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      'rail-icon',
                      isActive && 'active',
                      item.disabled && 'opacity-50 pointer-events-none',
                    )}
                    aria-disabled={item.disabled}
                  >
                    {Icon && <Icon className="size-icon" strokeWidth={2} />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Rail;
