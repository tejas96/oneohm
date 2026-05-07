'use client';

import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import { formatDate } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { ProjectFinanceDrawer } from '../drawers';
import {
  AgingBucketChip,
  AmountCell,
  CsvExportButton,
  LedgerToolbar,
  type CsvColumn,
} from '../shared';

import { ErrorState } from '@/components/shared';
import { MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import { type OutstandingTerm, useOrgOutstanding } from '@/lib/hooks/resources';

/**
 * Dues Calendar — grouped, scannable view of every open payment term.
 *
 * Buckets (per plan §5):
 *   - Overdue (dueDate < today, status not paid/waived/cancelled)
 *   - Today
 *   - Tomorrow
 *   - This Week (within next 7 days, excluding today/tomorrow)
 *   - Next Week (8-14 days out)
 *   - Later (>14 days out, or no due date)
 *
 * Source = useOrgOutstanding({}) — re-uses the same backend endpoint
 * that powers the Outstanding ledger; we just regroup client-side. We
 * pull a single 5000-row page (matches CSV cap) since the typical
 * dues count is in the low hundreds and grouping is cleaner against
 * the full set than against a paginated slice.
 *
 * Row click opens ProjectFinanceDrawer for context + "Open Project"
 * deep-link (where the user can record a receipt).
 */

const PAGE_SIZE = 5000;

interface BucketRow {
  key: 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek' | 'later';
  label: string;
  description: string;
  items: OutstandingTerm[];
  total: number;
  tone: 'error' | 'warning' | 'default';
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

function classify(today: Date, term: OutstandingTerm): BucketRow['key'] {
  if (!term.dueDate) return 'later';
  const due = new Date(term.dueDate);
  if (Number.isNaN(due.getTime())) return 'later';
  const diff = diffDays(today, due);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'thisWeek';
  if (diff <= 14) return 'nextWeek';
  return 'later';
}

const EMPTY_BUCKETS = (): Record<BucketRow['key'], OutstandingTerm[]> => ({
  overdue: [],
  today: [],
  tomorrow: [],
  thisWeek: [],
  nextWeek: [],
  later: [],
});

const BUCKET_META: Record<
  BucketRow['key'],
  { label: string; description: string; tone: BucketRow['tone'] }
> = {
  overdue: { label: 'Overdue', description: 'Past due date', tone: 'error' },
  today: { label: 'Today', description: 'Due today', tone: 'warning' },
  tomorrow: { label: 'Tomorrow', description: 'Due tomorrow', tone: 'warning' },
  thisWeek: { label: 'This Week', description: 'Due within 7 days', tone: 'default' },
  nextWeek: { label: 'Next Week', description: '8-14 days out', tone: 'default' },
  later: { label: 'Later', description: '>14 days out, or no due date', tone: 'default' },
};

export function FinanceCalendarPage(): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [drawerProject, setDrawerProject] = React.useState<{
    projectId: string;
    projectNumber: string;
    projectName: string;
    customerName: string;
  } | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useOrgOutstanding({
    page: 1,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    sort: 'dueDate',
    sortOrder: 'ASC',
  });

  const { orgHeaders } = useOrgContext();

  const today = React.useMemo(() => startOfDay(new Date()), []);

  const buckets = React.useMemo<BucketRow[]>(() => {
    const items = query.data?.data ?? [];
    const grouped = EMPTY_BUCKETS();
    for (const t of items) {
      grouped[classify(today, t)].push(t);
    }
    return (Object.keys(BUCKET_META) as BucketRow['key'][]).map((key) => {
      const list = grouped[key];
      return {
        key,
        label: BUCKET_META[key].label,
        description: BUCKET_META[key].description,
        items: list,
        total: list.reduce((s, t) => s + Number(t.outstandingAmount), 0),
        tone: BUCKET_META[key].tone,
      };
    });
  }, [query.data, today]);

  const grandTotal = React.useMemo(() => buckets.reduce((s, b) => s + b.total, 0), [buckets]);

  const fetchAllForCsv = React.useCallback(
    async (cap: number): Promise<OutstandingTerm[]> => {
      const { data } = await apiClient.get<PaginatedResponse<OutstandingTerm>>(
        '/finance/outstanding',
        {
          headers: orgHeaders,
          params: {
            page: 1,
            limit: cap,
            search: debouncedSearch || undefined,
            sort: 'dueDate',
            sortOrder: 'ASC',
          },
        },
      );
      return data.data;
    },
    [orgHeaders, debouncedSearch],
  );

  const csvColumns: CsvColumn<OutstandingTerm>[] = React.useMemo(
    () => [
      { header: 'Due Date', accessor: (t) => (t.dueDate ? formatDate(t.dueDate, 'medium') : '') },
      { header: 'Bucket', accessor: (t) => BUCKET_META[classify(today, t)].label },
      { header: 'Project #', accessor: (t) => t.projectNumber },
      { header: 'Project', accessor: (t) => t.projectName },
      { header: 'Customer', accessor: (t) => t.customerName },
      { header: 'Term', accessor: (t) => t.name },
      { header: 'Expected', accessor: (t) => Number(t.expectedAmount) },
      { header: 'Paid', accessor: (t) => Number(t.paidAmount) },
      { header: 'Outstanding', accessor: (t) => Number(t.outstandingAmount) },
      { header: 'Days Overdue', accessor: (t) => t.daysOverdue ?? '' },
      { header: 'Status', accessor: (t) => t.status },
    ],
    [today],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">Dues Calendar</MUITypography>
        <MUITypography variant="body" className="text-foreground-secondary mt-1">
          Every open payment term grouped by when it&apos;s due. Click any row for project context.
        </MUITypography>
      </header>

      <LedgerToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search project, customer, or term…"
        actionsSlot={
          <CsvExportButton
            fetchAll={fetchAllForCsv}
            columns={csvColumns}
            filename="dues-calendar"
            disabled={(query.data?.data?.length ?? 0) === 0}
          />
        }
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        {query.isError ? (
          <ErrorState
            title="Couldn't load the dues calendar"
            description={query.error?.message ?? 'Unknown error'}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-foreground-secondary flex items-center gap-2 text-sm">
              <CalendarMonthOutlinedIcon fontSize="small" />
              <span>
                {query.isLoading
                  ? 'Loading…'
                  : `${query.data?.meta.total ?? 0} open terms · grand total ${formatINR(grandTotal)}`}
              </span>
            </div>

            {buckets.map((b) => (
              <BucketSection
                key={b.key}
                bucket={b}
                isLoading={query.isLoading}
                onRowClick={(t) =>
                  setDrawerProject({
                    projectId: t.projectId,
                    projectNumber: t.projectNumber,
                    projectName: t.projectName,
                    customerName: t.customerName,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <ProjectFinanceDrawer
        open={drawerProject !== null}
        onClose={() => setDrawerProject(null)}
        projectId={drawerProject?.projectId ?? null}
        projectNumber={drawerProject?.projectNumber}
        projectName={drawerProject?.projectName}
        customerName={drawerProject?.customerName}
      />
    </div>
  );
}

function BucketSection({
  bucket,
  isLoading,
  onRowClick,
}: {
  bucket: BucketRow;
  isLoading: boolean;
  onRowClick: (t: OutstandingTerm) => void;
}): React.JSX.Element {
  const toneRing =
    bucket.tone === 'error'
      ? 'border-l-error'
      : bucket.tone === 'warning'
        ? 'border-l-warning'
        : 'border-l-border';
  return (
    <section
      className={`border-border-light bg-surface overflow-hidden rounded-md border border-l-4 ${toneRing}`}
    >
      <header className="border-border-light bg-background-secondary flex items-center justify-between gap-3 border-b px-3 py-2">
        <div>
          <MUITypography variant="bodyPrimary">
            {bucket.label}
            <span className="text-foreground-tertiary ml-2 text-xs font-normal">
              {bucket.description}
            </span>
          </MUITypography>
        </div>
        <div className="flex items-center gap-3">
          <MUITypography variant="finePrint" className="text-foreground-tertiary">
            {bucket.items.length} term{bucket.items.length === 1 ? '' : 's'}
          </MUITypography>
          <MUITypography variant="bodyPrimary" className="tabular-nums">
            {formatINR(bucket.total)}
          </MUITypography>
        </div>
      </header>
      <ul className="divide-border-light divide-y">
        {isLoading && bucket.items.length === 0 && (
          <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">Loading…</li>
        )}
        {!isLoading && bucket.items.length === 0 && (
          <li className="text-foreground-tertiary px-3 py-3 text-center text-sm">
            Nothing in this bucket.
          </li>
        )}
        {bucket.items.map((t) => (
          <li
            key={t.id}
            onClick={() => onRowClick(t)}
            className="hover:bg-surface-secondary grid cursor-pointer grid-cols-12 items-center gap-2 px-3 py-2 transition-colors"
          >
            <div className="col-span-3 min-w-0">
              <MUITypography variant="bodyPrimary" className="truncate">
                {t.dueDate ? formatDate(t.dueDate, 'medium') : 'No due date'}
              </MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-tertiary">
                {t.daysOverdue == null
                  ? '—'
                  : t.daysOverdue > 0
                    ? `${t.daysOverdue} day${t.daysOverdue === 1 ? '' : 's'} overdue`
                    : t.daysOverdue === 0
                      ? 'Due today'
                      : `Due in ${Math.abs(t.daysOverdue)} day${Math.abs(t.daysOverdue) === 1 ? '' : 's'}`}
              </MUITypography>
            </div>
            <div className="col-span-3 min-w-0">
              <MUITypography variant="bodyPrimary" className="truncate">
                {t.projectNumber}
              </MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-tertiary truncate">
                {t.projectName}
              </MUITypography>
            </div>
            <div className="col-span-3 min-w-0">
              <MUITypography variant="body" className="truncate">
                {t.customerName}
              </MUITypography>
              <MUITypography variant="finePrint" className="text-foreground-tertiary truncate">
                {t.name}
              </MUITypography>
            </div>
            <div className="col-span-2 text-right">
              <AmountCell value={Number(t.outstandingAmount)} />
              <MUITypography variant="finePrint" className="text-foreground-tertiary">
                of {formatINR(Number(t.expectedAmount))}
              </MUITypography>
            </div>
            <div className="col-span-1 text-right">
              <AgingBucketChip bucket={t.agingBucket} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Local helper — kept tiny so we don't bring `formatCurrency` from
// `@/lib/utils` into a file that's already importing a lot.
function formatINR(v: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}
