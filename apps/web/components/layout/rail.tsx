'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CountBadge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isNavItemActive } from '@/lib/config';
import { useFilteredNavigation, type GatedRailItem } from '@/lib/hooks/use-filtered-navigation';
import { useAccessDialog } from '@/lib/rbac';
import { cn } from '@/lib/utils';

interface RailProps {
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  className?: string;
}

/**
 * One rail icon, gated.
 *
 * A blocked item renders as a `button`, not a `Link`: it stays visible and
 * clickable so the access dialog can explain what is missing, but it never
 * navigates. Rendering a real link would fire a middleware round-trip and
 * flash the deny page on every misclick.
 */
function RailItem({
  item,
  isActive,
}: {
  item: GatedRailItem;
  isActive: boolean;
}): React.JSX.Element {
  const { requestAccess } = useAccessDialog();
  const Icon = item.icon;

  const content = (
    <>
      {Icon && <Icon className="size-icon" strokeWidth={2} />}
      {typeof item.badge === 'number' && item.allowed && (
        <CountBadge
          count={item.badge}
          variant="primary"
          size="2xs"
          className="absolute top-0.5 right-0.5"
        />
      )}
    </>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {item.allowed ? (
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
            {content}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => requestAccess(item.permission, item.label)}
            className="rail-icon opacity-40"
            aria-disabled="true"
            aria-label={`${item.label} — access needed`}
          >
            {content}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {item.allowed ? item.label : `${item.label} — access needed`}
      </TooltipContent>
    </Tooltip>
  );
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
          {navigation.railTop.map((item) => (
            // panelKey drives active state so e.g. /properties lights up CRM
            <RailItem
              key={item.id}
              item={item}
              isActive={isNavItemActive(pathname, item.href, item.panelKey)}
            />
          ))}
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
          {navigation.railBottom.map((item) => (
            <RailItem
              key={item.id}
              item={item}
              isActive={isNavItemActive(pathname, item.href, item.panelKey)}
            />
          ))}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Rail;
