'use client';

import type { FixedRoleCode } from '@tejas96/shared';
import { type JSX } from 'react';

import {
  buildGrantSummary,
  type GrantSummary,
} from '../utils/fixed-role-picker-state';

export interface FixedRoleGrantSummaryProps {
  selectedRoles: readonly FixedRoleCode[];
}

export function FixedRoleGrantSummary({
  selectedRoles,
}: FixedRoleGrantSummaryProps): JSX.Element {
  const summary: GrantSummary = buildGrantSummary(selectedRoles);

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-border-light bg-background-secondary p-4"
    >
      <h3 className="text-sm font-semibold text-foreground">{summary.headline}</h3>

      {summary.emptyMessage ? (
        <p className="mt-2 text-sm text-foreground-tertiary">{summary.emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {summary.sections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                {section.title}
              </p>
              <ul className="mt-1.5 space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="text-sm text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {summary.placeholderOnlyMessage ? (
        <p className="mt-3 text-sm text-warning">{summary.placeholderOnlyMessage}</p>
      ) : null}
    </section>
  );
}
