'use client';

import type { JSX } from 'react';

import { cn } from '@/lib/utils';

/**
 * A choice between a few views of one page (a period, a scope), as a row of
 * pills with the chosen one raised.
 *
 * `role="tablist"`: it selects between views of one page, which is what tabs
 * mean. On a narrow screen the pills wrap onto a second line.
 */
export function PillTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Names the group for a screen reader: "Reporting period". */
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-[20px] bg-background-tertiary p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 whitespace-nowrap rounded-pill px-3.5 text-[13px] font-medium tracking-[-0.01em] transition-colors motion-reduce:transition-none',
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
