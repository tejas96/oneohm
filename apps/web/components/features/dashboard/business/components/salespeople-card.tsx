'use client';

import * as React from 'react';

import { BusinessCard } from './business-card';
import { money, type MoneyFormat } from '../lib/format';

import { Avatar, AvatarFallback } from '@/components/ui';
import type { PipelineLeaderboardEntry } from '@/lib/hooks/resources/pipeline';

const VISIBLE = 6;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${second}`.toUpperCase();
}

interface SalespeopleCardProps {
  entries: PipelineLeaderboardEntry[];
  format: MoneyFormat;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Who is carrying the pipeline.
 *
 * Ordered by pipeline value, which is what the header says. The API returns an
 * `isUnassigned` row for work belonging to nobody — it is kept rather than
 * filtered out, because unassigned pipeline is a real management problem and
 * hiding it makes the column of names add up to less than the funnel.
 */
export function SalespeopleCard({
  entries,
  format,
  isError,
  onRetry,
}: SalespeopleCardProps): React.JSX.Element {
  const ranked = React.useMemo(
    () => [...entries].sort((a, b) => b.pipelineValue - a.pipelineValue),
    [entries],
  );
  const shown = ranked.slice(0, VISIBLE);

  return (
    <BusinessCard
      label="Salespeople"
      aside="by pipeline"
      isError={isError}
      onRetry={onRetry}
      errorHeight={260}
      link={{
        label: ranked.length > VISIBLE ? `All ${ranked.length} salespeople` : 'Open pipeline',
        href: '/pipeline',
      }}
    >
      {shown.length === 0 ? (
        <p className="pb-2 pt-0.5 text-[13.5px] text-foreground-tertiary">
          No sales activity in this period.
        </p>
      ) : (
        shown.map((person) => (
          <a
            key={person.salesPersonId ?? 'unassigned'}
            href="/pipeline"
            className="-mx-2.5 flex min-h-[46px] items-center gap-3 rounded-xl px-2.5 hover:bg-background-tertiary"
          >
            <Avatar className="size-[30px]">
              <AvatarFallback className="text-[11px]">
                {person.isUnassigned ? '—' : initials(person.salesPersonName)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium tracking-[-0.01em]">
                {person.salesPersonName}
              </span>
              <span className="mt-px block text-[11.5px] text-foreground-tertiary">
                {person.propertyCount} propert{person.propertyCount === 1 ? 'y' : 'ies'} ·{' '}
                {person.wonCount} won
              </span>
            </span>
            <span className="w-24 text-right font-mono text-[13px] tabular-nums">
              {money(person.pipelineValue, format)}
            </span>
            <span className="w-10 text-right text-[12.5px] tabular-nums text-foreground-secondary">
              {person.winRate}%
            </span>
          </a>
        ))
      )}
    </BusinessCard>
  );
}
