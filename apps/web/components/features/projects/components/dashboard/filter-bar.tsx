'use client';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import * as React from 'react';

import { MUIDateRangePicker, MUISelect } from '@/components/ui';
import type { DashboardFilters } from '@/lib/hooks/resources';

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_fy', label: 'This financial year' },
  { value: 'custom', label: 'Custom dates' },
];

const MAX_DAYS = 1096;

function toIsoDay(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * One period picker and one Cash/Loan switch for the whole page (spec D2).
 * A custom range is applied only once both dates are set and valid, so half a
 * range never fires a request.
 */
export function FilterBar({
  filters,
  onChange,
}: {
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
}): React.JSX.Element {
  const [customOpen, setCustomOpen] = React.useState(filters.period === 'custom');
  const [draft, setDraft] = React.useState<{ from?: string; to?: string }>({
    from: filters.from,
    to: filters.to,
  });
  const [error, setError] = React.useState<string | null>(null);

  const applyDraft = (next: { from?: string; to?: string }): void => {
    setDraft(next);
    if (!next.from || !next.to) return setError(null);
    if (next.from > next.to) return setError('"To" is before "From".');
    const span = (Date.parse(next.to) - Date.parse(next.from)) / 86_400_000 + 1;
    if (span > MAX_DAYS) return setError('Pick 3 years or less.');
    setError(null);
    onChange({ period: 'custom', from: next.from, to: next.to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MUISelect
        size="small"
        aria-label="Period"
        value={customOpen ? 'custom' : filters.period}
        options={PERIOD_OPTIONS}
        onChange={(e) => {
          const value = e.target.value as DashboardPeriod;
          if (value === 'custom') {
            setCustomOpen(true);
            return;
          }
          setCustomOpen(false);
          setError(null);
          onChange({ period: value });
        }}
        sx={{ minWidth: 168 }}
      />
      {customOpen ? (
        <div className="flex flex-col">
          <MUIDateRangePicker
            fromDate={draft.from ?? null}
            toDate={draft.to ?? null}
            onFromChange={(d) => applyDraft({ ...draft, from: d ? toIsoDay(d) : undefined })}
            onToChange={(d) => applyDraft({ ...draft, to: d ? toIsoDay(d) : undefined })}
          />
          {error ? (
            <p role="alert" className="mt-1 text-xs text-error">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={filters.financing}
        onChange={(_, next: DashboardFinancing | null) => {
          // MUI returns null when the active button is clicked again.
          if (next) onChange({ financing: next });
        }}
        aria-label="Cash or loan projects"
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="cash">Cash</ToggleButton>
        <ToggleButton value="loan">Loan</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
