'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { DashboardItem } from '@tejas96/shared/types';
import { AlertCircle, CalendarCheck, CalendarDays } from 'lucide-react';
import * as React from 'react';

import { dashboardKeys, useFollowupForItem, useMyWork } from '../hooks';
import { DashboardRow } from './dashboard-row';
import { ProjectRow } from './project-row';
import { SectionCard, SectionSkeleton } from './section-card';
import { ViewAllDrawer } from './view-all-drawer';
import { SECTION_OVERFLOW } from '../lib/action-routes';
import { liftCritical, liftedAside } from '../lib/lift';

import { FollowupCompleteDialog } from '@/components/features/followups';
import { Typography } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

const CAP = { attention: 6, workflow: 5, followups: 5, service: 5, projects: 4, money: 3 };

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// `SECTION_OVERFLOW` is keyed by `Record<string, ...>`, so under this repo's
// `noUncheckedIndexedAccess` every read of it is `OverflowEntry | undefined`
// even for the four keys that link to a real route. This helper absorbs that
// `| undefined` in one place instead of asserting it away at each call site
// below. The two `kind: 'drawer'` entries (workflow, needsAttention) never go
// through here — their overflow is built from the section's own data instead,
// since whether to show it at all depends on a count `SECTION_OVERFLOW` does
// not carry.
type OverflowEntry = (typeof SECTION_OVERFLOW)[string];

function overflowHref(entry: OverflowEntry | undefined): string | undefined {
  if (entry?.kind !== 'route') return undefined;
  return entry.href;
}

export function MyWorkPage(): React.JSX.Element {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useMyWork();
  const [followupItem, setFollowupItem] = React.useState<DashboardItem | null>(null);
  const [drawer, setDrawer] = React.useState<{
    title: string;
    items: DashboardItem[];
    total: number;
  } | null>(null);
  const { followup, pendingSiblings } = useFollowupForItem(followupItem);

  // Rendered only after mount so the server and client agree on the greeting —
  // the same guard the old placeholder page used.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (isPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_304px]">
        <div className="flex flex-col gap-4">
          <SectionSkeleton rows={6} />
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={5} />
        </div>
        <div className="flex flex-col gap-4">
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={3} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl bg-surface p-6 shadow-e2">
        <Typography variant="body">
          Your dashboard could not be loaded.{' '}
          <button type="button" onClick={() => void refetch()} className="text-secondary underline">
            Try again
          </button>
        </Typography>
      </div>
    );
  }

  const { critical, criticalTotal, rest, liftedBySection, criticalBySection } = liftCritical(
    data.sections,
  );
  const { summary } = data;
  const name = user?.firstName ?? '';

  const renderRows =
    (cap: number) =>
    (items: DashboardItem[]): React.ReactNode =>
      items
        .slice(0, cap)
        .map((item) => (
          <DashboardRow key={item.id} item={item} onCompleteFollowup={setFollowupItem} />
        ));

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_304px]">
      <div className="flex flex-col gap-4">
        {/* 1. Greeting */}
        <section className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-e2">
          <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-end gap-3">
            <Typography variant="h2">
              {mounted ? greeting(new Date().getHours()) : 'Welcome'}
              {name ? `, ${name}` : ''}
            </Typography>
            {/* Today's date anchors every relative date further down the page —
                "due 26 Aug", "Mon 24 Aug". Static text, never a control. */}
            {mounted ? (
              <span className="pb-1 text-xs text-foreground-tertiary">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            ) : null}
          </div>
          <p className="relative mt-2 text-sm text-foreground-secondary">
            <span className="font-medium text-error">{summary.overdue} overdue</span>
            {` · ${summary.dueToday} due today · ${summary.dueThisWeek} more this week`}
          </p>
        </section>

        {/* 2. Needs attention — critical only, gathered from every section.
            The badge counts `criticalTotal`, the number that EXISTS, while the
            rows are the capped list that reached the browser. Counting the rows
            instead put "Overdue 92" and "Needs attention · 14" on one screen
            describing one set. */}
        <SectionCard
          label="Needs attention"
          tone="critical"
          section={{
            status: 'ok',
            total: criticalTotal,
            criticalCount: criticalTotal,
            buckets: [{ key: 'critical', label: 'Critical', count: criticalTotal, items: critical }],
          }}
          emptyMessage="Nothing critical right now."
          skeletonRows={6}
          overflow={
            criticalTotal > CAP.attention
              ? {
                  label: 'View all',
                  onClick: () =>
                    setDrawer({ title: 'Needs attention', items: critical, total: criticalTotal }),
                }
              : undefined
          }
        >
          {renderRows(CAP.attention)}
        </SectionCard>

        {/* 3. Workflow stuck */}
        <SectionCard
          label="Workflow stuck"
          tone="warning"
          section={rest.workflow}
          aside={liftedAside(liftedBySection.workflow)}
          emptyMessage="No leads are stuck."
          skeletonRows={5}
          onRetry={() => void refetch()}
          overflow={
            rest.workflow.status === 'ok' && rest.workflow.total > CAP.workflow
              ? {
                  label: 'View all',
                  onClick: () =>
                    setDrawer({
                      title: 'Workflow stuck',
                      items:
                        rest.workflow.status === 'ok'
                          ? rest.workflow.buckets.flatMap((b) => b.items)
                          : [],
                      total: rest.workflow.status === 'ok' ? rest.workflow.total : 0,
                    }),
                }
              : undefined
          }
        >
          {renderRows(CAP.workflow)}
        </SectionCard>

        {/* 4. Follow-ups */}
        <SectionCard
          label="Follow-ups"
          tone="info"
          section={rest.followups}
          aside={liftedAside(liftedBySection.followups, 'overdue')}
          emptyMessage="No follow-ups need attention."
          skeletonRows={5}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open follow-ups', href: overflowHref(SECTION_OVERFLOW.followups) }}
        >
          {renderRows(CAP.followups)}
        </SectionCard>

        {/* 5. Service requests */}
        <SectionCard
          label="Service requests"
          tone="info"
          section={rest.service}
          aside={liftedAside(liftedBySection.service, 'overdue')}
          emptyMessage="No service requests need you."
          skeletonRows={5}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open service', href: overflowHref(SECTION_OVERFLOW.service) }}
        >
          {renderRows(CAP.service)}
        </SectionCard>

        {/* 6. Project health — does NOT lift; overdue projects appear here AND above */}
        <SectionCard
          label="Project health"
          section={rest.projects}
          aside={
            criticalBySection.projects > 0 ? 'overdue projects also appear above' : undefined
          }
          emptyMessage="Every project is on track."
          skeletonRows={4}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open projects', href: overflowHref(SECTION_OVERFLOW.projects) }}
        >
          {(items) =>
            items.slice(0, CAP.projects).map((item) => <ProjectRow key={item.id} item={item} />)
          }
        </SectionCard>
      </div>

      <div className="flex flex-col gap-4">
        {/* 7. At a glance — three DISJOINT numbers, summed from the sections */}
        <section className="rounded-xl bg-surface p-5 shadow-e2">
          <h2 className="pb-2 text-section font-semibold uppercase tracking-wide text-foreground-secondary">
            At a glance
          </h2>
          {[
            { label: 'Overdue', value: summary.overdue, Icon: AlertCircle, tint: 'bg-error/10 text-error' },
            { label: 'Due today', value: summary.dueToday, Icon: CalendarCheck, tint: 'bg-warning/10 text-warning' },
            { label: 'Due this week', value: summary.dueThisWeek, Icon: CalendarDays, tint: 'bg-info/10 text-info' },
          ].map(({ label, value, Icon, tint }) => (
            <div key={label} className="flex min-h-12 items-center gap-3">
              <span className={`flex size-8 items-center justify-center rounded-full ${tint}`}>
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-base font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </section>

        {/* 8. Money to chase */}
        <SectionCard
          label="Money to chase"
          tone="warning"
          section={rest.finance}
          aside={liftedAside(liftedBySection.finance, 'overdue')}
          emptyMessage="No payments are due."
          skeletonRows={3}
          onRetry={() => void refetch()}
          overflow={{ label: 'Open finance', href: overflowHref(SECTION_OVERFLOW.finance) }}
        >
          {renderRows(CAP.money)}
        </SectionCard>
      </div>

      {drawer ? (
        <ViewAllDrawer
          open
          onOpenChange={(next) => {
            if (!next) setDrawer(null);
          }}
          title={drawer.title}
          items={drawer.items}
          total={drawer.total}
          onCompleteFollowup={setFollowupItem}
        />
      ) : null}

      <FollowupCompleteDialog
        open={Boolean(followup)}
        followup={followup}
        pendingSiblings={pendingSiblings}
        onClose={() => {
          setFollowupItem(null);
          // The row that was just completed must leave the page immediately. A
          // count that survives the action it just performed is how people stop
          // trusting the screen.
          void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        }}
      />
    </div>
  );
}
