'use client';

import { Button } from '@mui/material';
import * as React from 'react';

import { FY_PRESETS, FY_PRESET_LABEL, type FyPreset } from '../constants';
import { detectPreset, resolveFyPresetRange } from './date-presets';

import { MUIDatePicker } from '@/components/ui';

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  /** Optional override of the date used for preset resolution (testing). */
  now?: Date;
  className?: string;
}

/**
 * FY-aware date-range control used by the dashboard, vendors, and
 * profitability pages. Renders 6 preset chips (`This Month`, `Last
 * Month`, `This Quarter`, `This FY`, `Last FY`, `Custom`) and reveals a
 * pair of `MUIDatePicker` inputs only when `Custom` is active.
 *
 * The selected preset is derived from the current value, so URL
 * rehydration keeps the right chip highlighted.
 */
export function DateRangePicker({
  value,
  onChange,
  now,
  className,
}: DateRangePickerProps): React.JSX.Element {
  const activePreset: FyPreset = detectPreset(value.from, value.to, now);

  const handlePreset = React.useCallback(
    (preset: FyPreset): void => {
      if (preset === 'custom') {
        onChange({ from: value.from, to: value.to });
        return;
      }
      const range = resolveFyPresetRange(preset, now);
      if (range) onChange(range);
    },
    [onChange, value.from, value.to, now],
  );

  const handleFrom = React.useCallback(
    (date: Date | null): void => {
      onChange({ from: date ? toYmd(date) : undefined, to: value.to });
    },
    [onChange, value.to],
  );

  const handleTo = React.useCallback(
    (date: Date | null): void => {
      onChange({ from: value.from, to: date ? toYmd(date) : undefined });
    },
    [onChange, value.from],
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      {/**
       * Segmented control, per the DS: a sunken track holding pill segments,
       * with only the active one raised onto a surface. Previously these were
       * individual contained/outlined buttons at 4px radius — the one place in
       * the app still showing square controls and an outlined button.
       */}
      <div className="bg-background-tertiary flex flex-wrap items-center gap-0.5 rounded-full p-0.5">
        {FY_PRESETS.map((preset) => {
          const isActive = activePreset === preset;
          return (
            <Button
              key={preset}
              size="small"
              // `text` for both states — the active segment is distinguished by
              // its raised surface, not by a different button variant.
              variant="text"
              onClick={() => handlePreset(preset)}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 12,
                minWidth: 0,
                px: 1.5,
                py: 0.5,
                height: 26,
                borderRadius: 999,
                color: isActive ? 'text.primary' : 'text.secondary',
                backgroundColor: isActive ? 'background.paper' : 'transparent',
                boxShadow: isActive ? 'var(--shadow-e1)' : 'none',
                '&:hover': {
                  backgroundColor: isActive ? 'background.paper' : 'var(--ds-canvas)',
                },
              }}
            >
              {FY_PRESET_LABEL[preset]}
            </Button>
          );
        })}
      </div>

      {activePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="w-[150px]">
            <MUIDatePicker
              value={value.from ?? null}
              onChange={handleFrom}
              placeholder="From"
              fullWidth
            />
          </div>
          <span className="text-foreground-tertiary text-sm">to</span>
          <div className="w-[150px]">
            <MUIDatePicker
              value={value.to ?? null}
              onChange={handleTo}
              placeholder="To"
              fullWidth
            />
          </div>
        </div>
      )}
    </div>
  );
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
