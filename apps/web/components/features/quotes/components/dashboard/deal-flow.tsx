'use client';

import type { DealMoney, QuotesDashboard } from '@tejas96/shared/types';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { quoteLinks } from './links';
import { formatRupees } from './strip';

import { AnimatedNumber, ENTER, enterDelay, formatKw } from '@/components/features/dashboard/kit';
import type { DashboardFilters } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

const BLOCK =
  'relative block overflow-hidden rounded-[10px] bg-surface-alt p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none';

function Base({ color }: { color: string }): React.JSX.Element {
  return <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1" style={{ background: color }} />;
}

function OpenBlock({
  label,
  money,
  href,
  color,
  index,
}: {
  label: string;
  money: DealMoney;
  href: string;
  color: string;
  index: number;
}): React.JSX.Element {
  return (
    <Link href={href} className={cn(BLOCK, ENTER)} style={enterDelay(index)}>
      <span className="text-xs font-medium text-foreground-secondary">{label}</span>
      <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">
        <AnimatedNumber value={money.count} />
      </span>
      <span className="block text-xs text-foreground-tertiary">{formatRupees(money.valueRupees)}</span>
      <span className="block text-xs text-foreground-tertiary">{formatKw(money.kw)}</span>
      <Base color={color} />
    </Link>
  );
}

function Arrow(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="flex items-center justify-center text-foreground-tertiary">
      <ChevronRight className="size-4 rotate-90 lg:rotate-0" />
    </span>
  );
}

/** Drafting › Waiting › Gone quiet › Won / Lost. Problem counts live in Needs action only. */
export function DealFlow({
  data,
  filters,
}: {
  data: QuotesDashboard;
  filters: DashboardFilters;
}): React.JSX.Element {
  const { stages, period } = data;
  return (
    <section className={cn('rounded-xl bg-surface p-5 shadow-e2', ENTER)} style={enterDelay(4)}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Where every deal is</h2>
        <span className="text-2xs text-foreground-tertiary">select a stage to see its deals</span>
      </header>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_16px_1fr_16px_1fr_16px_1fr]">
        <OpenBlock
          label="Drafting"
          money={stages.drafting}
          href={quoteLinks.stage('drafting', filters)}
          color="var(--ds-neutral-300)"
          index={5}
        />
        <Arrow />
        <OpenBlock
          label="Waiting"
          money={stages.waiting}
          href={quoteLinks.stage('waiting', filters)}
          color="var(--ds-primary-light)"
          index={6}
        />
        <Arrow />
        <OpenBlock
          label="Gone quiet"
          money={stages.quiet}
          href={quoteLinks.stage('quiet', filters)}
          color="var(--ds-danger)"
          index={7}
        />
        <Arrow />
        <div className="grid gap-2">
          <Link
            href={quoteLinks.won(period.from, period.to, filters)}
            className={cn(BLOCK, 'py-3', ENTER)}
            style={enterDelay(8)}
          >
            <span className="flex items-baseline justify-between text-xs font-medium text-foreground-secondary">
              Won <span className="text-2xs font-normal text-foreground-tertiary">{period.label}</span>
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                <AnimatedNumber value={stages.won.count} />
              </span>
            </span>
            <Base color="var(--ds-primary)" />
          </Link>
          <Link
            href={quoteLinks.lost(period.from, period.to, filters)}
            className={cn(BLOCK, 'py-3', ENTER)}
            style={enterDelay(9)}
          >
            <span className="flex items-baseline justify-between text-xs font-medium text-foreground-secondary">
              Lost <span className="text-2xs font-normal text-foreground-tertiary">{period.label}</span>
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                <AnimatedNumber value={stages.lost.count} />
              </span>
              {stages.lost.topReason ? (
                <span className="truncate text-xs text-foreground-tertiary">
                  mostly {stages.lost.topReason.toLowerCase()}
                </span>
              ) : null}
            </span>
            <Base color="var(--ds-neutral-300)" />
          </Link>
        </div>
      </div>
    </section>
  );
}
