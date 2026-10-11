'use client';

import { Button } from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useState } from 'react';

import { ApprovalKpiCards } from './approval-kpi-cards';
import { ApprovalReviewDrawer } from './approval-review-drawer';
import { ApprovalRow, ApprovalRowSkeleton } from './approval-row';
import { useAutoFileApprovedReceipts } from './hooks/use-auto-file-receipts';

import type { ColumnConfig, FilterState } from '@/components/shared/advanced-table';
import {
  CalmListPage,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  ListToolbar,
  Segment,
  SegmentCard,
  SelectionBar,
  type SortOption,
  useListEntrance,
} from '@/components/shared/calm-list';
import { showToast } from '@/components/ui/sonner';
import type { TableUrlSortModel } from '@/lib/hooks';
import {
  useApprovalMutations,
  useApprovalSummary,
  usePaymentApprovals,
  type ApprovalKind,
  type ApprovalStatus,
  type PaymentApproval,
} from '@/lib/hooks/resources/payment-approvals';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 25;

const EMPTY_ROWS: PaymentApproval[] = [];

/** Sort fields the API whitelists. Anything else is dropped rather than guessed. */
type SortField = 'valueDate' | 'amountPaise' | 'submittedAt' | 'customerName';
const SORTABLE: readonly SortField[] = ['valueDate', 'amountPaise', 'submittedAt', 'customerName'];

/**
 * The four sortable columns of the old table. With no sort the API drains the
 * queue in the order it filled — longest waiting first — which is why that
 * option sends none.
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Longest waiting first', model: null },
  { label: 'Newest request first', model: { field: 'submittedAt', direction: 'desc' } },
  { label: 'Date: newest first', model: { field: 'valueDate', direction: 'desc' } },
  { label: 'Date: oldest first', model: { field: 'valueDate', direction: 'asc' } },
  { label: 'Amount: large to small', model: { field: 'amountPaise', direction: 'desc' } },
  { label: 'Amount: small to large', model: { field: 'amountPaise', direction: 'asc' } },
  { label: 'Customer A–Z', model: { field: 'customerName', direction: 'asc' } },
  { label: 'Customer Z–A', model: { field: 'customerName', direction: 'desc' } },
];

/** The filter panel: what kind of money, and its date. */
const FILTER_COLUMNS: ColumnConfig<PaymentApproval>[] = [
  {
    field: 'kind',
    headerName: 'Type',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Receipt', value: 'receipt' },
      { label: 'Expense', value: 'expense' },
      { label: 'Vendor payment', value: 'vendor_payment' },
      { label: 'Reversal', value: 'reversal' },
      { label: 'Commission', value: 'commission' },
    ],
  },
  { field: 'valueDate', headerName: 'Date', filterable: true, filterType: 'date' },
];

/** The status tabs, in the order the chips had. */
const STATUS_VIEWS: ReadonlyArray<{ status: ApprovalStatus; label: string; dot?: string }> = [
  { status: 'pending', label: 'Pending', dot: 'var(--ds-warning)' },
  { status: 'approved', label: 'Approved', dot: 'var(--ds-primary)' },
  { status: 'rejected', label: 'Rejected', dot: 'var(--ds-danger)' },
  { status: 'cancelled', label: 'Withdrawn' },
];

const REQUEST_NOUN = { one: 'request', many: 'requests' };

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 10;

/**
 * Read one filter as a string. `FilterState` values are `unknown`, and the table
 * hands back '' when a filter is cleared — which has to become `undefined` so
 * the query key drops the parameter rather than sending an empty one.
 */
function readFilter(filters: FilterState, field: string): string | undefined {
  const value = filters[field];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * The approval queue.
 *
 * Money recorded anywhere in the app lands here first. Nothing on this screen
 * has touched the ledger yet — approving is what does that.
 */
export function PaymentApprovalsPage(): JSX.Element {
  const processApprovals = useGatedAction(
    'finance.approvals.process',
    () => undefined,
    'Approve payments',
  );
  const { user } = useAuth();

  // The status tab lives in the URL (`?status=rejected`), so a notification can
  // open the right tab and a refresh keeps it. Pending is the bare URL.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = toStatus(searchParams.get('status'));
  const setStatus = (next: ApprovalStatus): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'pending') params.delete('status');
    else params.set('status', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // The pager's `page` is zero-indexed; the API is one-indexed. Kept zero-based
  // here and converted at the call. Remembered per status, so arriving on
  // another tab from a link starts at its first page.
  const [pageFor, setPageFor] = useState<{ status: ApprovalStatus; page: number }>({
    status,
    page: 0,
  });
  const page = pageFor.status === status ? pageFor.page : 0;
  const setPage = (next: number): void => setPageFor({ status, page: next });
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<FilterState>({});
  const [sortModel, setSortModel] = useState<TableUrlSortModel | null>(null);
  const [selected, setSelected] = useState<PaymentApproval | null>(null);

  // A notice links to one request (`?open=<id>`). Arriving on one opens that
  // request in the drawer and clears whatever search was left in the box, so
  // the queue behind it is not quietly filtered to something else — a stale
  // search once made the page say "Nothing waiting" right under a notice that
  // said something was. Keyed on the link, not on typing. (The search box
  // follows `search`, so clearing it here clears the box too.)
  const openId = searchParams.get('open');
  const [linkSeen, setLinkSeen] = useState<string | null>(null);
  if (openId !== linkSeen) {
    setLinkSeen(openId);
    if (openId) {
      setSearch('');
      setPageFor({ status, page: 0 });
    }
  }
  const closeDrawer = (): void => {
    setSelected(null);
    if (!openId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('open');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const summary = useApprovalSummary();
  const kindFilter = readFilter(filters, 'kind');
  const dateFilter = readFilter(filters, 'valueDate');

  const query = usePaymentApprovals({
    status,
    page: page + 1,
    limit: pageSize,
    search: search || undefined,
    kind: toKind(kindFilter),
    // A single date filter means that exact day, so it bounds both ends.
    dateFrom: dateFilter,
    dateTo: dateFilter,
    sortBy: SORTABLE.find((f) => f === sortModel?.field),
    sortOrder: sortModel?.direction,
  });
  const { bulkApprove } = useApprovalMutations();
  const autoFileReceipts = useAutoFileApprovedReceipts();

  const rows = query.data?.data ?? EMPTY_ROWS;

  /*
   * The Pending chip counts what the table under it holds. The queue-wide
   * summary said "Pending · 14" beside 4 rows once a type filter was on. While
   * Pending is open that is the list's own total; on another tab the whole
   * queue is only right when nothing narrows it, so otherwise it shows none.
   */
  const narrowed = Boolean(search || kindFilter || dateFilter);
  const pendingChipCount =
    status === 'pending' && query.data
      ? query.data.total
      : narrowed
        ? undefined
        : summary.data?.pendingCount;

  // ── Ticked rows (bulk approve, the pending tab only). A row that leaves the
  // page drops out of the ticks; the rest stay, as they did in the table. ──
  const [tickedIds, setTickedIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    setTickedIds((current) => {
      if (current.size === 0) return current;
      const available = new Set(rows.map((row) => row.id));
      const next = new Set([...current].filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows]);
  const handleTick = useCallback((row: PaymentApproval, ticked: boolean): void => {
    setTickedIds((current) => {
      const next = new Set(current);
      if (ticked) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  }, []);
  const tickable = status === 'pending';
  const tickedRows = tickable ? rows.filter((row) => tickedIds.has(row.id)) : [];

  const approveTicked = (selectedRows: PaymentApproval[]): void => {
    // Own submissions are filtered here so the button is honest;
    // the server refuses them regardless.
    const ids = selectedRows.filter((r) => r.submittedBy !== user?.id).map((r) => r.id);
    if (!processApprovals.allowed) {
      processApprovals.onGatedClick();
      return;
    }
    // Say so, rather than doing nothing: a click that silently
    // approves nothing looks like the button is broken.
    const own = selectedRows.length - ids.length;
    if (own > 0) {
      const them = own === 1 ? 'it' : 'them';
      showToast.warning(
        ids.length === 0
          ? `You recorded ${own === 1 ? 'this payment' : 'these payments'}, so someone else must approve ${them}.`
          : `${own} you recorded ${own === 1 ? 'was' : 'were'} skipped. Someone else must approve ${them}.`,
      );
    }
    if (ids.length > 0) {
      bulkApprove.mutate(ids, {
        // Not awaited — see the single-approve drawer for why.
        onSuccess: (result) => void autoFileReceipts.fileManyByIds(result.approved),
      });
    }
  };

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  return (
    <CalmListPage
      // Four figures and the tabs would leave little room for the queue.
      pinHeader={false}
      header={
        <>
          <ListTitle
            title="Payment approvals"
            sub="Money waits here until someone other than the person who recorded it confirms it — nothing below affects a customer's balance until then."
          />

          <ApprovalKpiCards />

          {/* The status tabs. Pending carries a live count only where one is
              meaningful (see `pendingChipCount`). */}
          <SegmentCard label="Requests by status">
            {STATUS_VIEWS.map((view) => (
              <Segment
                key={view.status}
                pressed={status === view.status}
                onClick={() => setStatus(view.status)}
                count={view.status === 'pending' ? (pendingChipCount ?? null) : null}
                label={view.label}
                dot={view.dot}
              />
            ))}
          </SegmentCard>
        </>
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={(next) => {
            setSearch(next);
            setPage(0);
          }}
          searchPlaceholder="Search request number, customer, project or reference"
          searchLabel="Search requests"
          // The approvals API searches on any length.
          searchMinLength={1}
          filterColumns={FILTER_COLUMNS}
          filters={filters}
          onFilterChange={(next) => {
            setFilters(next);
            setPage(0);
          }}
          sortOptions={SORT_OPTIONS}
          sortModel={sortModel}
          onSortChange={(next) => {
            setSortModel(next);
            setPage(0);
          }}
        />
      }
      error={
        query.isError ? (
          <ListError
            title="Couldn’t load the requests"
            message={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : null
      }
      isFetching={query.isFetching}
      isLoading={query.isLoading}
      page={page}
      footer={
        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={query.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(0);
          }}
          noun={REQUEST_NOUN}
          countUnknown={query.isError && !query.data}
        />
      }
      overlays={
        <>
          {tickedRows.length > 0 ? (
            <SelectionBar
              // "requests", like the footer: a selection can hold expenses and bills too.
              label={`${tickedRows.length} request${tickedRows.length === 1 ? '' : 's'} selected`}
              onClear={() => setTickedIds(new Set())}
            >
              {tickedRows.length < rows.length ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setTickedIds(new Set(rows.map((row) => row.id)))}
                >
                  Select all {rows.length}
                </Button>
              ) : null}
              <Button size="small" variant="contained" onClick={() => approveTicked(tickedRows)}>
                Approve selected
              </Button>
            </SelectionBar>
          ) : null}

          <ApprovalReviewDrawer approvalId={selected?.id ?? openId} onClose={closeDrawer} />
        </>
      }
    >
      {query.isLoading ? (
        <ListSkeleton
          rows={Math.min(pageSize, MAX_SKELETON_ROWS)}
          label="Loading requests"
          renderRow={() => <ApprovalRowSkeleton tickable={tickable} />}
        />
      ) : rows.length === 0 ? (
        query.isError ? null : (
          <ListEmpty
            title={status === 'pending' ? 'Nothing waiting for approval.' : 'Nothing to show here.'}
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <ApprovalRow
              key={row.id}
              row={row}
              index={index}
              entering={entering}
              tickable={tickable}
              ticked={tickedIds.has(row.id)}
              onTick={handleTick}
              reviewing={(selected?.id ?? openId) === row.id}
              onReview={setSelected}
            />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}

/** Anything that is not a known tab is the pending queue. */
function toStatus(value: string | null): ApprovalStatus {
  return value === 'approved' || value === 'rejected' || value === 'cancelled' ? value : 'pending';
}

/** Narrows the free-form filter value to a kind the API accepts. */
function toKind(value: string | undefined): ApprovalKind | undefined {
  return value === 'receipt' ||
    value === 'expense' ||
    value === 'reversal' ||
    value === 'vendor_payment' ||
    value === 'commission'
    ? value
    : undefined;
}
