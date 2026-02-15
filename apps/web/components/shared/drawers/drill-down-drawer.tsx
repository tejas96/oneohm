'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DrillDownItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface DrillDownDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Called when drawer should close */
  onOpenChange: (open: boolean) => void;
  /** Drawer title */
  title: string;
  /** Subtitle showing count */
  subtitle?: string;
  /** Items to display */
  items: DrillDownItem[];
  /** Enable search filtering */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Filter callback for search */
  onSearch?: (query: string) => void;
  /** Custom render function for items */
  renderItem?: (item: DrillDownItem) => React.ReactNode;
  /** Header actions */
  headerActions?: React.ReactNode;
  /** Empty state content */
  emptyContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Default Item Renderer
// ============================================================================

function DefaultItemRenderer({ item }: { item: DrillDownItem }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted transition-colors duration-fast">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          {item.badge}
        </div>
        {item.subtitle && (
          <p className="text-xs text-foreground-secondary truncate mt-0.5">{item.subtitle}</p>
        )}
      </div>
      {item.actions && (
        <div className="flex items-center gap-2 ml-4 shrink-0">{item.actions}</div>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DrillDownDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  items,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  renderItem,
  headerActions,
  emptyContent,
  className,
}: DrillDownDrawerProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Reset search when drawer closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  // Filter items if no external search handler
  const filteredItems = onSearch
    ? items
    : items.filter((item) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query)
        );
      });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('w-full sm:max-w-lg p-0 flex flex-col', className)}>
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border-light">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg">{title}</SheetTitle>
              {subtitle && (
                <p className="text-sm text-foreground-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              <SheetClose asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <X className="size-icon-sm" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>
          </div>

          {/* Search */}
          {searchable && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-icon-sm text-foreground-tertiary" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 h-input-md"
              />
            </div>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              {emptyContent || (
                <p className="text-sm text-foreground-secondary">No items found</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {filteredItems.map((item) =>
                renderItem ? (
                  <div key={item.id}>{renderItem(item)}</div>
                ) : (
                  <DefaultItemRenderer key={item.id} item={item} />
                )
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
