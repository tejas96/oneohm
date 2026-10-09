'use client';

import Add from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  BiggestOpen,
  DealFlow,
  NeedsAction,
  PersonPicker,
  QuotesDashboardSkeleton,
  QuotesStrip,
  QuotesTrendChart,
  Sources,
  Team,
} from './dashboard';

import { BandError, FilterBar, useDashboardFilters } from '@/components/features/dashboard/kit';
import { ROUTES } from '@/lib/config/routes';
import { useQuotesDashboard } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';

/**
 * /quotes — where every deal is, what needs action and by whom, where the
 * money and the leads are. One request (`GET /quotes/dashboard`); every figure
 * links to the quote list of exactly the deals behind it. Spec:
 * docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md
 */
export function QuoteDashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { filters, setFilters, reset, isDefault } = useDashboardFilters();
  const { data, isLoading, isError, isFetching, refetch } = useQuotesDashboard(filters);
  const newQuote = useGatedAction('quotes.create', () => void router.push(ROUTES.QUOTES.NEW), 'New quote');
  const retry = (): void => void refetch();
  const refreshFailed = isError && !!data;

  const isEmpty =
    !!data &&
    data.strip.newDeals.count === 0 &&
    data.stages.drafting.count + data.stages.waiting.count + data.stages.quiet.count === 0 &&
    data.stages.won.count === 0 &&
    data.trend.every((t) => t.newCount === 0 && t.wonCount === 0);

  let body: React.ReactNode;
  if (isLoading && !data) {
    body = <QuotesDashboardSkeleton />;
  } else if (isError && !data) {
    body = (
      <div className="flex flex-col gap-5">
        <BandError what="the summary" onRetry={retry} />
        <BandError what="deals by stage" onRetry={retry} />
        <BandError what="what needs action" onRetry={retry} />
        <BandError what="the 12-month trend" onRetry={retry} />
      </div>
    );
  } else if (data && isEmpty) {
    body = (
      <section className="rounded-xl bg-surface p-10 text-center shadow-e2">
        <p className="text-sm text-foreground-secondary">
          {isDefault ? 'No deals yet.' : 'No deals match these filters.'}
        </p>
        {!isDefault ? (
          <button type="button" onClick={reset} className="mt-3 text-sm font-medium text-primary-dark hover:underline">
            Clear filters
          </button>
        ) : null}
      </section>
    );
  } else if (data) {
    body = (
      <div className="flex flex-col gap-5">
        <QuotesStrip data={data} filters={filters} />
        <DealFlow data={data} filters={filters} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <NeedsAction data={data} filters={filters} />
          </div>
          <div className="lg:col-span-2">
            <Team data={data} filters={filters} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <BiggestOpen data={data} filters={filters} />
          <Sources data={data} filters={filters} />
        </div>
        <QuotesTrendChart data={data} filters={filters} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-background p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Quotes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} financingLabel="Cash or loan deals">
            <PersonPicker
              people={data?.people ?? []}
              value={filters.person}
              onChange={(person) => setFilters({ person })}
            />
          </FilterBar>
          <Button component={Link} href={ROUTES.QUOTES.LIST} variant="outlined" size="small">
            All quotes
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={newQuote.onGatedClick}
            aria-disabled={!newQuote.allowed}
            sx={{ opacity: newQuote.allowed ? 1 : 0.5 }}
          >
            New quote
          </Button>
        </div>
      </header>
      <p role="status" className={refreshFailed ? '-mt-2 text-xs text-foreground-secondary' : 'sr-only'}>
        {refreshFailed ? (
          <>
            Could not refresh ·{' '}
            <button
              type="button"
              onClick={retry}
              disabled={isFetching}
              className="font-medium text-primary-dark hover:underline disabled:opacity-60"
            >
              Retry
            </button>
          </>
        ) : null}
      </p>
      {body}
    </div>
  );
}
