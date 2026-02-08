'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { navigationConfig, isNavItemActive } from '@/lib/config';
import { cn } from '@/lib/utils';

interface RailProps {
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  className?: string;
}

/**
 * Rail - 48px fixed icon navigation strip
 * Features: Icon buttons with tooltips, active state, notification badges
 * Uses centralized navigation config from lib/config/navigation.ts
 */
export function Rail({ isPanelOpen, onTogglePanel, className }: RailProps) {
  const pathname = usePathname();

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
          className
        )}
      >
        {/* Top Navigation */}
        <nav className="flex-1 flex flex-col pt-1.5">
          {navigationConfig.railTop.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'rail-icon',
                      isActive && 'active',
                      item.disabled && 'opacity-50 pointer-events-none'
                    )}
                    aria-disabled={item.disabled}
                  >
                    {Icon && <Icon className="w-5 h-5" strokeWidth={2} />}
                    {item.badge !== undefined && (
                      <span className="badge-notification">
                        {typeof item.badge === 'number' && item.badge > 99
                          ? '99+'
                          : item.badge}
                      </span>
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
        <div className="border-t border-border-light pb-1.5">
          {/* Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onTogglePanel}
                className="rail-icon w-full"
                aria-label={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
              >
                {isPanelOpen ? (
                  <ChevronsLeft className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <ChevronsRight className="w-5 h-5" strokeWidth={2} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {isPanelOpen ? 'Collapse panel' : 'Expand panel'} (⌘\)
            </TooltipContent>
          </Tooltip>

          {/* Bottom Nav Items */}
          {navigationConfig.railBottom.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'rail-icon',
                      isActive && 'active',
                      item.disabled && 'opacity-50 pointer-events-none'
                    )}
                    aria-disabled={item.disabled}
                  >
                    {Icon && <Icon className="w-5 h-5" strokeWidth={2} />}
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
