'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { getFilteredPanelByPath, useFilteredNavigation } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Panel - 200px collapsible sidebar
 * Features: Dynamic content based on rail selection, section headers, menu items
 * Uses filtered navigation based on user permissions and roles
 */
export function Panel({ isOpen, onClose, className }: PanelProps) {
  const pathname = usePathname();
  const { navigation } = useFilteredNavigation();
  const panelData = getFilteredPanelByPath(navigation, pathname);

  // If no panel config available (user doesn't have access), don't render
  if (!panelData) {
    return null;
  }

  const { config } = panelData;

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
        className
      )}
    >
      {/* Panel Header - 48px per UX spec */}
      <div className="h-header px-4 flex items-center justify-between border-b border-border-light shrink-0">
        <span className="text-base font-semibold text-foreground">
          {config.title}
        </span>
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
            <div className="panel-section-header">
              {section.title}
            </div>

            {/* Section Items */}
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'panel-item',
                    isActive && 'active',
                    item.disabled && 'opacity-50 pointer-events-none'
                  )}
                  aria-disabled={item.disabled}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                >
                  {Icon && <Icon className="size-icon-sm mr-2.5 shrink-0" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <Badge variant="secondary" size="sm" className="ml-2">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Panel;
