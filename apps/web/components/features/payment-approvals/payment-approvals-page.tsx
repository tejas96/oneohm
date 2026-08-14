'use client';

import { Box } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { ApprovalKpiCards } from './approval-kpi-cards';
import { ApprovalReviewDrawer } from './approval-review-drawer';
import { APPROVAL_COLUMNS, type ApprovalRow } from './columns';
import { useAutoFileApprovedReceipts } from './hooks/use-auto-file-receipts';

import type { FilterState, TableSortModel } from '@/components/shared/advanced-table';
import { CrmTable, type CrmQuickFilter } from '@/components/shared/crm-table';
import {
  useApprovalMutations,
  useApprovalSummary,
  usePaymentApprovals,
  type ApprovalKind,
  type ApprovalStatus,
} from '@/lib/hooks/resources/payment-approvals';
import { color, crm } from '@/lib/theme/tokens';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 25;

/** Sort fields the API whitelists. Anything else is dropped rather than guessed. */
type SortField = 'valueDate' | 'amountPaise' | 'submittedAt' | 'customerName';
const SORTABLE: readonly SortField[] = ['valueDate', 'amountPaise', 'submittedAt', 'customerName'];

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
  const { user } = useAuth();

  const [status, setStatus] = useState<ApprovalStatus>('pending');
  // CrmTable's `page` is zero-indexed (it renders `page + 1`); the API is
  // one-indexed. Kept zero-based here and converted at the call.
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [sortModel, setSortModel] = useState<TableSortModel | null>(null);
  const [selected, setSelected] = useState<ApprovalRow | null>(null);

  const summary = useApprovalSummary();
  const kindFilter = readFilter(filters, 'kind');
  const dateFilter = readFilter(filters, 'valueDate');

  const query = usePaymentApprovals({
    status,
    page: page + 1,
    limit: PAGE_SIZE,
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

  const rows = (query.data?.data ?? []) as ApprovalRow[];

  /** Status chips carry a live count only where one is meaningful. */
  const quickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      {
        key: 'pending',
        label: 'Pending',
        count: summary.data?.pendingCount,
        tone: 'warning',
        dot: true,
      },
      { key: 'approved', label: 'Approved', tone: 'success', dot: true },
      { key: 'rejected', label: 'Rejected', tone: 'danger', dot: true },
      { key: 'cancelled', label: 'Withdrawn', tone: 'neutral', dot: false },
    ],
    [summary.data?.pendingCount],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, lg: 3 } }}>
      <Box>
        <Box
          component="span"
          sx={{
            fontSize: 'var(--text-overline-size)',
            fontWeight: 700,
            letterSpacing: 'var(--text-overline-track)',
            textTransform: 'uppercase',
            color: color['text-tertiary'],
          }}
        >
          Finance
        </Box>
        <Box
          component="h1"
          sx={{
            m: 0,
            mt: '5px',
            mb: '3px',
            fontSize: crm['text-page-title'],
            fontWeight: 700,
            letterSpacing: crm['text-page-title-track'],
          }}
        >
          Payment approvals
        </Box>
        <Box
          component="p"
          sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
        >
          Money waits here until someone other than the person who recorded it confirms it — nothing
          below affects a customer&apos;s balance until then.
        </Box>
      </Box>

      <ApprovalKpiCards />

      <CrmTable<ApprovalRow>
        columns={APPROVAL_COLUMNS}
        rows={rows}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        refetching={query.isFetching && !query.isLoading}
        itemLabel="payments"
        // Narrower than the CRM default of 1280px: this grid has fewer columns
        // than the customer list, and Status must stay on screen rather than
        // sitting past a horizontal scroll.
        gridMinWidth="940px"
        searchPlaceholder="Search request number, customer, project or reference"
        onSearchChange={(next) => {
          setSearch(next);
          setPage(0);
        }}
        quickFilters={quickFilters}
        activeQuickFilter={status}
        onQuickFilterChange={(key) => {
          setStatus((key || 'pending') as ApprovalStatus);
          setPage(0);
        }}
        filterColumns={[
          {
            field: 'kind',
            headerName: 'Type',
            filterable: true,
            filterType: 'select',
            filterOptions: [
              { label: 'Receipt', value: 'receipt' },
              { label: 'Expense', value: 'expense' },
              { label: 'Reversal', value: 'reversal' },
            ],
          },
          { field: 'valueDate', headerName: 'Payment date', filterable: true, filterType: 'date' },
        ]}
        filterModel={filters}
        onFilterChange={(next) => {
          setFilters(next);
          setPage(0);
        }}
        sortModel={sortModel}
        onSortChange={(next) => {
          setSortModel(next);
          setPage(0);
        }}
        page={page}
        pageSize={PAGE_SIZE}
        totalRowCount={query.data?.total ?? 0}
        onPageChange={setPage}
        onRowClick={setSelected}
        enableRowSelection={status === 'pending'}
        selectionLabel={(count) => `${count} payment${count === 1 ? '' : 's'} selected`}
        bulkActions={
          status === 'pending'
            ? [
                {
                  label: 'Approve selected',
                  onClick: (selectedRows: ApprovalRow[]) => {
                    // Own submissions are filtered here so the button is honest;
                    // the server refuses them regardless.
                    const ids = selectedRows
                      .filter((r) => r.submittedBy !== user?.id)
                      .map((r) => r.id);
                    if (ids.length > 0) {
                      bulkApprove.mutate(ids, {
                        // Not awaited — see the single-approve drawer for why.
                        onSuccess: (result) => void autoFileReceipts.fileManyByIds(result.approved),
                      });
                    }
                  },
                },
              ]
            : []
        }
        emptyMessage={
          status === 'pending' ? 'Nothing waiting for approval.' : 'Nothing to show here.'
        }
      />

      <ApprovalReviewDrawer approvalId={selected?.id ?? null} onClose={() => setSelected(null)} />
    </Box>
  );
}

/** Narrows the free-form filter value to a kind the API accepts. */
function toKind(value: string | undefined): ApprovalKind | undefined {
  return value === 'receipt' || value === 'expense' || value === 'reversal' ? value : undefined;
}
