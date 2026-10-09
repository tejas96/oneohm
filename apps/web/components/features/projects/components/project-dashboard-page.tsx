'use client';

import Add from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import type { StageGroupKey } from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  BandError,
  ComingUp,
  DashboardSkeleton,
  FilterBar,
  NeedsAction,
  OwnerStrip,
  StagePanel,
  StagePipeline,
  StuckByTeam,
  TrendChart,
  useDashboardFilters,
} from './dashboard';

import { ROUTES } from '@/lib/config/routes';
import { useProjectsDashboard } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';

/**
 * /projects — where the portfolio is, what needs action, where it is heading.
 * One request (`GET /projects/dashboard`); every figure links to the list of
 * exactly the projects behind it. Spec:
 * docs/superpowers/specs/2026-10-08-projects-dashboard-design.md
 */
export function ProjectDashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { filters, setFilters, reset, isDefault } = useDashboardFilters();
  const { data, isLoading, isError, isFetching, refetch } = useProjectsDashboard(filters);
  const [openStage, setOpenStage] = React.useState<StageGroupKey | null>(null);
  const newProject = useGatedAction(
    'projects.create',
    () => void router.push(ROUTES.PROJECTS.NEW),
    'New project',
  );
  const retry = (): void => void refetch();
  const refreshFailed = isError && !!data;

  const isEmpty =
    !!data &&
    data.strip.live.count === 0 &&
    data.strip.onboarded.count === 0 &&
    data.strip.meterInstalled.count === 0 &&
    data.trend.every((t) => t.onboarded === 0 && t.meterInstalled === 0);

  let body: React.ReactNode;
  if (isLoading && !data) {
    body = <DashboardSkeleton />;
  } else if (isError && !data) {
    body = (
      <div className="flex flex-col gap-5">
        <BandError what="the summary" onRetry={retry} />
        <BandError what="projects by stage" onRetry={retry} />
        <BandError what="what needs action" onRetry={retry} />
        <BandError what="the 12-month trend" onRetry={retry} />
      </div>
    );
  } else if (data && isEmpty) {
    body = (
      <section className="rounded-xl bg-surface p-10 text-center shadow-e2">
        <p className="text-sm text-foreground-secondary">
          {isDefault ? 'No projects yet.' : 'No projects match these filters.'}
        </p>
        {!isDefault ? (
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-sm font-medium text-primary-dark hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </section>
    );
  } else if (data) {
    body = (
      <div className="flex flex-col gap-5">
        <OwnerStrip data={data} financing={filters.financing} />
        <StagePipeline data={data} financing={filters.financing} onOpenStage={setOpenStage} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <NeedsAction data={data} financing={filters.financing} />
          </div>
          <div className="lg:col-span-2">
            <StuckByTeam data={data} financing={filters.financing} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart data={data} financing={filters.financing} />
          </div>
          <ComingUp data={data} financing={filters.financing} />
        </div>
        <StagePanel
          stageKey={openStage}
          data={data}
          financing={filters.financing}
          onClose={() => setOpenStage(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-background p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Projects</h1>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} />
          <Button component={Link} href={ROUTES.PROJECTS.LIST} variant="outlined" size="small">
            All projects
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={newProject.onGatedClick}
            aria-disabled={!newProject.allowed}
            sx={{ opacity: newProject.allowed ? 1 : 0.5 }}
          >
            New project
          </Button>
        </div>
      </header>
      {/* Always mounted so a screen reader announces the text when it appears; out of the
          layout (no flex gap) while empty. */}
      <p
        role="status"
        className={refreshFailed ? '-mt-2 text-xs text-foreground-secondary' : 'sr-only'}
      >
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
