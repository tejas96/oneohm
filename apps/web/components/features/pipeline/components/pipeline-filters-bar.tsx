'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { PIPELINE_DEFAULT_RANGE, PIPELINE_SALESPERSON_ALL } from '../constants';

import { MUIDateRangePicker, MUISelect, MUITypography } from '@/components/ui';
import { STATS_MAX_WINDOW_DAYS, useAdminUsersList, type AdminUser } from '@/lib/hooks/resources';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 365 days' },
  { value: 'custom', label: 'Custom range' },
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

/**
 * Formats a Date using its local calendar day (not UTC), avoiding the
 * off-by-one-day shift that `toISOString()` introduces for timezones ahead of UTC
 * (e.g. selecting 1 Jan in IST would otherwise serialize as 31 Dec via UTC conversion).
 */
function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function spanDaysInclusive(fromDate: string, toDate: string): number {
  const start = new Date(`${fromDate}T00:00:00Z`).getTime();
  const end = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

export function PipelineFiltersBar(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = searchParams.get('range') ?? PIPELINE_DEFAULT_RANGE;
  const fromDate = searchParams.get('fromDate') ?? '';
  const toDate = searchParams.get('toDate') ?? '';
  const salesPersonId = searchParams.get('salesPersonId') ?? PIPELINE_SALESPERSON_ALL;

  const { data: usersData } = useAdminUsersList({ limit: 100 });
  const users = usersData?.items ?? [];

  const writeParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const handleRangeChange = (value: string): void => {
    if (value === 'custom') {
      writeParams({ range: value });
    } else {
      writeParams({ range: value, fromDate: null, toDate: null });
    }
  };

  const handleCustomFrom = (date: Date | null): void => {
    if (!date) return;
    writeParams({ range: 'custom', fromDate: toLocalIsoDate(date) });
  };

  const handleCustomTo = (date: Date | null): void => {
    if (!date) return;
    writeParams({ range: 'custom', toDate: toLocalIsoDate(date) });
  };

  const customError =
    range === 'custom' && fromDate && toDate
      ? !isValidIsoDate(fromDate) || fromDate > toDate
        ? 'Enter a valid date range'
        : spanDaysInclusive(fromDate, toDate) > STATS_MAX_WINDOW_DAYS
          ? `Date range cannot exceed ${STATS_MAX_WINDOW_DAYS} days`
          : undefined
      : undefined;

  const salesPersonOptions = [
    { value: PIPELINE_SALESPERSON_ALL, label: 'All Salespersons' },
    ...users.map((u: AdminUser) => ({
      value: u.id,
      label: [u.firstName, u.lastName].filter(Boolean).join(' '),
    })),
  ];

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <MUITypography variant="drawerTitle">Sales Funnel</MUITypography>
        <MUITypography variant="body" className="mt-1 text-foreground-secondary">
          Pipeline overview and conversion insights
        </MUITypography>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px]">
          <MUISelect
            fieldLabel="Salesperson"
            value={salesPersonId}
            onChange={(e) => {
              const val = e.target.value as string;
              writeParams({
                salesPersonId: val === PIPELINE_SALESPERSON_ALL ? null : val,
              });
            }}
            options={salesPersonOptions}
            size="small"
          />
        </div>
        <div className="min-w-[160px]">
          <MUISelect
            fieldLabel="Time range"
            value={range}
            onChange={(e) => handleRangeChange(e.target.value as string)}
            options={RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            size="small"
          />
        </div>
        {range === 'custom' && (
          <MUIDateRangePicker
            fromDate={fromDate || null}
            toDate={toDate || null}
            onFromChange={handleCustomFrom}
            onToChange={handleCustomTo}
            error={customError}
          />
        )}
      </div>
    </div>
  );
}
