'use client';

import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Time-window picker for the inventory dashboard and any chart that
 * pulls from the stats endpoints. Writes the selected window to the
 * URL so it survives reload + can be shared. Also accepts custom
 * `from`/`to` dates (kept simple in v1: no calendar popover, just two
 * text inputs accepting `YYYY-MM-DD`).
 *
 * URL contract (mirrors the backend stats endpoints exactly):
 *   * `?range=7d|30d|90d|365d|custom`
 *   * `?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD` (only used when range=custom)
 *
 * Behaviour:
 *   * Clicking a preset clears `fromDate`/`toDate` and sets `range`.
 *   * Switching to "Custom" reveals two date inputs and keeps `range=custom`.
 *   * Invalid custom dates are silently ignored (the picker shows an
 *     inline error label) — we don't optimistically push partial state
 *     to the URL.
 *
 * The component does NOT compute the resolved date range; the backend
 * helper `resolveStatsWindow` is responsible for that. Frontend only
 * round-trips the user's selection.
 */

export type TimeWindowPreset = '7d' | '30d' | '90d' | '365d' | 'custom';

export const TIME_WINDOW_PRESETS: ReadonlyArray<{ value: TimeWindowPreset; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 365 days' },
  { value: 'custom', label: 'Custom range' },
];

export interface TimeWindowPickerProps {
  /** URL search-param key for the preset. Defaults to `range`. */
  rangeKey?: string;
  /** URL key for custom from-date. Defaults to `fromDate`. */
  fromKey?: string;
  /** URL key for custom to-date. Defaults to `toDate`. */
  toKey?: string;
  /** Default preset when no URL value is set. Defaults to `30d`. */
  defaultRange?: TimeWindowPreset;
  className?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function TimeWindowPicker({
  rangeKey = 'range',
  fromKey = 'fromDate',
  toKey = 'toDate',
  defaultRange = '30d',
  className,
}: TimeWindowPickerProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = (searchParams.get(rangeKey) as TimeWindowPreset | null) ?? defaultRange;
  const from = searchParams.get(fromKey) ?? '';
  const to = searchParams.get(toKey) ?? '';

  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);

  // Sync local drafts when URL changes (e.g. browser back/forward).
  React.useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  const writeToUrl = React.useCallback(
    (next: { range?: TimeWindowPreset; fromDate?: string | null; toDate?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.range !== undefined) params.set(rangeKey, next.range);
      if (next.fromDate === null) params.delete(fromKey);
      else if (next.fromDate !== undefined) params.set(fromKey, next.fromDate);
      if (next.toDate === null) params.delete(toKey);
      else if (next.toDate !== undefined) params.set(toKey, next.toDate);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, rangeKey, fromKey, toKey, router, pathname],
  );

  const handlePresetChange = (next: string): void => {
    const preset = next as TimeWindowPreset;
    if (preset === 'custom') {
      writeToUrl({ range: preset });
    } else {
      writeToUrl({ range: preset, fromDate: null, toDate: null });
    }
  };

  const handleCustomApply = (): void => {
    if (!isValidISODate(draftFrom) || !isValidISODate(draftTo)) return;
    if (draftFrom > draftTo) return;
    writeToUrl({ range: 'custom', fromDate: draftFrom, toDate: draftTo });
  };

  const customError =
    range === 'custom' &&
    draftFrom &&
    draftTo &&
    (!isValidISODate(draftFrom) || !isValidISODate(draftTo) || draftFrom > draftTo)
      ? 'Enter a valid YYYY-MM-DD range with from ≤ to'
      : null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={range} onValueChange={handlePresetChange}>
        <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
          <CalendarTodayRoundedIcon
            sx={{ fontSize: 14 }}
            className="mr-1 text-foreground-tertiary"
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_WINDOW_PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-8 rounded-md border border-border-medium bg-surface px-2 text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-foreground-tertiary">to</span>
          <input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-8 rounded-md border border-border-medium bg-surface px-2 text-xs"
            aria-label="To date"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleCustomApply}
            disabled={Boolean(customError) || !draftFrom || !draftTo}
          >
            Apply
          </Button>
          {customError && <span className="text-xs text-error">{customError}</span>}
        </div>
      )}
    </div>
  );
}

TimeWindowPicker.displayName = 'TimeWindowPicker';
