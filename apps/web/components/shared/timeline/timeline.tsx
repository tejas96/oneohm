'use client';

import { ChevronDown, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  // Caller provides icon - no hardcoded types
  icon: React.ReactNode;
  iconBgClass?: string; // e.g., 'bg-blue-100'
  iconTextClass?: string; // e.g., 'text-blue-600'
  // Optional rich content
  content?: React.ReactNode;
  badge?: {
    label: string;
    variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  };
  action?: { label: string; onClick?: () => void; href?: string };
  // For display
  actor?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  variant?: 'full' | 'compact';
  groupByDate?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  // Header with optional filter
  title?: string;
  filterOptions?: { value: string; label: string }[];
  onFilterChange?: (filter: string) => void;
  currentFilter?: string;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function groupItemsByDate(
  items: TimelineItem[]
): Map<string, TimelineItem[]> {
  const groups = new Map<string, TimelineItem[]>();

  items.forEach((item) => {
    const dateKey = item.timestamp.toDateString();
    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, item]);
  });

  return groups;
}

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

// ============================================================================
// Timeline Item Component (Full Variant)
// ============================================================================

interface TimelineItemFullProps {
  item: TimelineItem;
  isLast: boolean;
}

function TimelineItemFull({ item, isLast }: TimelineItemFullProps) {
  return (
    <div className="relative pl-10">
      {/* Icon */}
      <div
        className={cn(
          'absolute left-1.5 size-icon-md rounded-full border-2 border-white shadow flex items-center justify-center',
          item.iconBgClass || 'bg-muted'
        )}
      >
        <span className={cn('w-2.5 h-2.5', item.iconTextClass || 'text-foreground-muted')}>
          {item.icon}
        </span>
      </div>

      {/* Card */}
      <div
        className={cn(
          'bg-background rounded-lg border border-border-light p-4 shadow-sm',
          'transition-all duration-fast hover:shadow-md hover:translate-x-1',
          !isLast && 'mb-6'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">{item.title}</div>
            {item.description && (
              <div className="text-xs text-foreground-secondary mt-1">
                {item.description}
              </div>
            )}
          </div>
          <span className="text-xs text-foreground-tertiary ml-3 flex-shrink-0">
            {formatTime(item.timestamp)}
          </span>
        </div>

        {/* Rich content */}
        {item.content && <div className="mt-3">{item.content}</div>}

        {/* Badge and Action */}
        {(item.badge || item.action) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {item.badge && (
              <Badge variant={item.badge.variant}>
                {item.badge.label}
              </Badge>
            )}
            {item.action && (
              item.action.href ? (
                <a
                  href={item.action.href}
                  className="text-xs text-primary hover:text-primary-dark font-medium"
                >
                  {item.action.label} →
                </a>
              ) : (
                <button
                  type="button"
                  onClick={item.action.onClick}
                  className="text-xs text-primary hover:text-primary-dark font-medium cursor-pointer"
                >
                  {item.action.label} →
                </button>
              )
            )}
          </div>
        )}

        {/* Actor */}
        {item.actor && (
          <div className="mt-2 text-xs text-foreground-tertiary">
            by {item.actor}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Timeline Item Component (Compact Variant)
// ============================================================================

interface TimelineItemCompactProps {
  item: TimelineItem;
}

function TimelineItemCompact({ item }: TimelineItemCompactProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'size-container-sm rounded-full flex items-center justify-center flex-shrink-0',
          item.iconBgClass || 'bg-muted'
        )}
      >
        <span className={cn('size-icon-sm', item.iconTextClass || 'text-foreground-muted')}>
          {item.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{item.title}</div>
        <div className="text-xs text-foreground-tertiary">
          {formatDate(item.timestamp)}, {formatTime(item.timestamp)}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Date Marker Component
// ============================================================================

interface DateMarkerProps {
  date: Date;
}

function DateMarker({ date }: DateMarkerProps) {
  const today = isToday(date);

  return (
    <div className="relative flex items-center gap-4 pl-10 mb-6">
      <div
        className={cn(
          'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow',
          today ? 'bg-primary' : 'bg-border-medium'
        )}
      />
      <span
        className={cn(
          'text-xs font-semibold uppercase tracking-wide',
          today ? 'text-primary' : 'text-foreground-tertiary'
        )}
      >
        {formatDate(date)}
      </span>
    </div>
  );
}

// ============================================================================
// Main Timeline Component
// ============================================================================

export function Timeline({
  items,
  variant = 'full',
  groupByDate = true,
  onLoadMore,
  hasMore,
  isLoading,
  emptyMessage = 'No activity yet',
  title,
  filterOptions,
  onFilterChange,
  currentFilter,
  className,
}: TimelineProps) {
  // Sort items by timestamp (newest first)
  const sortedItems = React.useMemo(
    () => [...items].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [items]
  );

  // Group by date if enabled
  const groupedItems = React.useMemo(
    () => (groupByDate ? groupItemsByDate(sortedItems) : null),
    [groupByDate, sortedItems]
  );

  // Render full variant
  const renderFullVariant = () => {
    if (!groupedItems) {
      return sortedItems.map((item, index) => (
        <TimelineItemFull
          key={item.id}
          item={item}
          isLast={index === sortedItems.length - 1}
        />
      ));
    }

    const entries = Array.from(groupedItems.entries());
    return entries.map(([dateKey, dateItems], groupIndex) => (
      <React.Fragment key={dateKey}>
        <DateMarker date={new Date(dateKey)} />
        {dateItems.map((item, itemIndex) => (
          <TimelineItemFull
            key={item.id}
            item={item}
            isLast={
              groupIndex === entries.length - 1 &&
              itemIndex === dateItems.length - 1
            }
          />
        ))}
      </React.Fragment>
    ));
  };

  // Render compact variant
  const renderCompactVariant = () => (
    <div className="space-y-3">
      {sortedItems.map((item) => (
        <TimelineItemCompact key={item.id} item={item} />
      ))}
    </div>
  );

  return (
    <div className={cn('activity-timeline', className)}>
      {/* Header */}
      {(title || filterOptions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              {title}
            </h3>
          )}
          {filterOptions && onFilterChange && (
            <Select value={currentFilter} onValueChange={onFilterChange}>
              <SelectTrigger className="w-auto h-7 text-xs px-2 py-1 border-border-light">
                <SelectValue placeholder="Filter" />
                <ChevronDown className="size-icon-2xs ml-1 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && !isLoading && (
        <div className="text-center py-8 text-sm text-foreground-tertiary">
          {emptyMessage}
        </div>
      )}

      {/* Timeline Content */}
      {items.length > 0 && (
        <div className="relative">
          {/* Timeline Line (full variant only) */}
          {variant === 'full' && (
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          )}

          {variant === 'full' ? renderFullVariant() : renderCompactVariant()}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-icon-md animate-spin text-foreground-tertiary" />
        </div>
      )}

      {/* Load More */}
      {hasMore && onLoadMore && !isLoading && (
        <div className="mt-6 text-center">
          {variant === 'full' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              className="text-foreground-tertiary hover:text-foreground"
            >
              Load More Activity
            </Button>
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
            >
              View Full Timeline
            </button>
          )}
        </div>
      )}
    </div>
  );
}

Timeline.displayName = 'Timeline';
