'use client';

import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
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

/**
 * Help/info content rendered inside a modal when the user clicks the
 * `?` icon next to a chart title. `summary` is a one-liner (also used
 * as the tooltip text on hover); `details` is the long-form body.
 */
export interface ChartHelpContent {
  summary: string;
  /** Long-form body. Use a fragment to mix paragraphs / lists. */
  details: React.ReactNode;
}

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
  /** Optional help content shown via a `?` icon next to the title. */
  help?: ChartHelpContent;
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
  help,
  className,
  children,
}: ChartShellProps): React.JSX.Element {
  const [helpOpen, setHelpOpen] = React.useState(false);
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-border-light bg-surface p-card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">{title}</span>
                {help && (
                  <Tooltip title={help.summary} arrow placement="top">
                    <IconButton
                      aria-label={`About ${title}`}
                      size="small"
                      onClick={() => setHelpOpen(true)}
                      className="shrink-0"
                      sx={{ p: 0.25, color: 'rgb(113 113 122)' }}
                    >
                      <HelpOutlineRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            )}
            {description && (
              <div className="mt-0.5 truncate text-xs text-foreground-tertiary">{description}</div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {help && (
        <Dialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontSize: 16, fontWeight: 600, pb: 1 }}>
            {title ?? 'About this chart'}
          </DialogTitle>
          <DialogContent sx={{ fontSize: 13, color: 'rgb(63 63 70)', lineHeight: 1.6 }}>
            <div className="mb-3 text-xs uppercase tracking-wide text-foreground-tertiary">
              What it shows
            </div>
            <div className="mb-4 text-sm text-foreground">{help.summary}</div>
            <div className="mb-3 text-xs uppercase tracking-wide text-foreground-tertiary">
              How to read it
            </div>
            <div className="text-sm text-foreground-secondary">{help.details}</div>
          </DialogContent>
        </Dialog>
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
