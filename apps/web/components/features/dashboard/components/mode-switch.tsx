'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export type DashboardMode = 'work' | 'business';

const OPTIONS: ReadonlyArray<{ value: DashboardMode; label: string }> = [
  { value: 'work', label: 'My work' },
  { value: 'business', label: 'Business' },
];

interface ModeSwitchProps {
  value: DashboardMode;
  onChange: (mode: DashboardMode) => void;
}

/**
 * Which view of the dashboard you are looking at.
 *
 * Rendered only for holders of `dashboard.business.view` — the caller decides,
 * so this component never has to know about permissions.
 *
 * It sits with the page's own controls rather than in the app's top bar,
 * because it switches a view of this page rather than navigating anywhere. The
 * URL does not change.
 *
 * `role="tablist"` rather than a radio group: this selects between two views of
 * one page, which is what tabs mean, and it gives arrow-key movement for free
 * from the browser's own handling of the role.
 */
export function ModeSwitch({ value, onChange }: ModeSwitchProps): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Dashboard view"
      className="inline-flex h-10 w-[204px] items-center gap-1 rounded-pill bg-background-tertiary p-1"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 flex-1 rounded-pill text-[13px] font-medium tracking-[-0.01em] transition-colors',
              selected
                ? 'bg-surface text-foreground shadow-e1'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
