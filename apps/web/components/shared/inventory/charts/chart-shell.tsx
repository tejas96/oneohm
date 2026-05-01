'use client';

import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Common chrome wrapper for every inventory chart: optional title + the
 * standard loading skeleton, empty state, and error state. The actual
 * recharts component is rendered as `children` once data is ready.
 *
 * Why centralise this: every dashboard chart needs four states
 * (loading/empty/error/ready) and the recharts library doesn't ship any
 * of them — so without a wrapper each chart re-implements the same
 * conditional. That ends up inconsistent (different empty messages,
 * different skeleton sizes) and makes the whole dashboard feel sloppy.
 */

export interface ChartShellProps {
  title?: string;
  description?: string;
  /** Aspect-ratio container height; defaults to 240px. */
  height?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  error?: Error | string | null;
  /** Optional right-side action (e.g. "View all" link or a TimeWindowPicker). */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function ChartShell({
  title,
  description,
  height = 240,
  isLoading,
  isEmpty,
  emptyMessage = 'No data for this period',
  error,
  action,
  className,
  children,
}: ChartShellProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-border-light bg-surface p-card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <div className="truncate text-sm font-semibold text-foreground">{title}</div>
            )}
            {description && (
              <div className="mt-0.5 truncate text-xs text-foreground-tertiary">{description}</div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div
        style={{ height, minWidth: 0 }}
        className="relative w-full min-w-0 overflow-hidden"
      >
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : error ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-error">
            {typeof error === 'string' ? error : error.message}
          </div>
        ) : isEmpty ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-foreground-tertiary">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

ChartShell.displayName = 'ChartShell';
