'use client';

import { Card } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';

import { ApprovalReviewDrawer } from './approval-review-drawer';
import { approvalColumns, type ApprovalRow } from './columns';

import { AdvancedTable, type TableFilterModel } from '@/components/shared/advanced-table';
import { FilterTabs, type FilterTab } from '@/components/shared/filters';
import { MUITypography } from '@/components/ui';
import {
  useApprovalMutations,
  useApprovalSummary,
  usePaymentApprovals,
  type ApprovalKind,
  type ApprovalStatus,
} from '@/lib/hooks/resources/payment-approvals';
import { useAuth } from '@/providers/auth-provider';


const PAGE_SIZE = 25;

const KINDS: readonly ApprovalKind[] = ['receipt', 'expense', 'reversal'];

/**
 * Read one filter as a string.
 *
 * `TableFilterModel` values are `unknown`, and the table hands back '' when a
 * filter is cleared — which must become `undefined` so the query key drops the
 * parameter instead of sending an empty one.
 */
function readFilter(filters: TableFilterModel, field: string): string | undefined {
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
  // AdvancedTable's `page` is zero-indexed (it renders `page + 1`); the API is
  // one-indexed. Kept zero-based here and converted at the call.
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ApprovalRow | null>(null);

  // AdvancedTable does NO client-side search, filtering or sorting in server
  // pagination mode (Table.tsx returns `rows` untouched), so every control has
  // to be driven from here or it silently does nothing.
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TableFilterModel>({});

  const summary = useApprovalSummary();
  const query = usePaymentApprovals({
    status,
    page: page + 1,
    limit: PAGE_SIZE,
    search: search || undefined,
    kind: KINDS.find((k) => k === readFilter(filters, 'kind')),
    // A single date filter means that exact day, so it bounds both ends.
    dateFrom: readFilter(filters, 'valueDate'),
    dateTo: readFilter(filters, 'valueDate'),
  });
  const { bulkApprove } = useApprovalMutations();

  const columns = useMemo(() => approvalColumns(), []);
  const rows = (query.data?.data ?? []) as ApprovalRow[];

  const tabs: FilterTab<ApprovalStatus>[] = [
    { id: 'pending', label: 'Pending', count: summary.data?.pendingCount },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'cancelled', label: 'Withdrawn' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <MUITypography variant="drawerTitle">Payment Approvals</MUITypography>
        <MUITypography variant="body">
          Payments wait here until a second person verifies them. Nothing below affects a
          customer&apos;s balance until it is approved.
        </MUITypography>
      </div>

      <FilterTabs
        tabs={tabs}
        value={status}
        onChange={(next) => {
          setStatus(next);
          setPage(0);
        }}
      />

      <Card>
        <AdvancedTable<ApprovalRow>
          rows={rows}
          columns={columns}
          loading={query.isLoading}
          refetching={query.isFetching && !query.isLoading}
          paginationMode="server"
          totalRowCount={query.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          // The row itself opens the review, so the action never depends on a
          // Review button that a narrow window can push out of sight.
          onRowClick={setSelected}
          enableSearch
          searchPlaceholder="Search request number, reference or payer"
          onSearchChange={(next) => {
            setSearch(next);
            setPage(0);
          }}
          onFilterChange={(next) => {
            setFilters(next);
            setPage(0);
          }}
          emptyMessage={
            status === 'pending' ? 'Nothing waiting for approval.' : 'Nothing to show.'
          }
          bulkActions={
            status === 'pending'
              ? [
                  {
                    label: 'Approve selected',
                    color: 'success',
                    onClick: (selectedRows: ApprovalRow[]) => {
                      // Your own submissions are filtered out here so the button
                      // is honest; the server refuses them regardless.
                      const ids = selectedRows
                        .filter((r) => r.submittedBy !== user?.id)
                        .map((r) => r.id);
                      if (ids.length > 0) bulkApprove.mutate(ids);
                    },
                  },
                ]
              : []
          }
        />
      </Card>

      <ApprovalReviewDrawer approvalId={selected?.id ?? null} onClose={() => setSelected(null)} />
    </div>
  );
}
