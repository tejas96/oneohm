'use client';

import { type JSX, useCallback, useState } from 'react';

import { PayVendorDialog } from './pay-vendor-dialog';
import { PayableRowCard, PayableRowSkeleton } from './payable-row';

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
  StatTile,
  StatTiles,
  useListEntrance,
} from '@/components/shared/calm-list';
import { usePayables, type PayableRow } from '@/lib/hooks/resources/ledger';
import { getErrorMessage } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

const PAGE_SIZE = 25;

const VENDOR_NOUN = { one: 'vendor', many: 'vendors' };

/** A screenful; a longer page does not need a longer placeholder. */
const SKELETON_ROWS = 8;

/** This list has no filter panel. */
const NO_FILTER_COLUMNS: never[] = [];
const NO_FILTERS = {};
const ignoreFilters = (): void => undefined;

/**
 * Who we owe, vendor by vendor.
 *
 * A net balance per vendor, not bill-by-bill matching — two vendors and a
 * handful of credit bills do not justify an allocation table, and a net
 * balance cannot drift out of step with the ledger rows behind it. This is
 * the vendor-side mirror of Receivables: that page answers "who owes us",
 * this one answers "who do we owe".
 *
 * `payablePaise` is signed. Negative means the company paid ahead of its
 * bills — an advance, not a debt — and the Payable column renders it as
 * "Advance ₹X" in the success tone, never as a bare negative number that
 * would read as a mistake.
 *
 * A soft-deleted vendor still carrying a balance stays on this list, flagged
 * Inactive: money owed does not disappear because someone tidied the vendor
 * list.
 *
 * Every figure here — all three KPI cards and every row value — comes
 * straight from the API's `data` and `totals`. There is deliberately no
 * client-side sum: the old AR table added up only the rows on the visible
 * page and labelled the result "Total", which is how a month-end
 * reconciliation went wrong.
 */
export function FinancePayablesPage(): JSX.Element {
  // The pager's `page` is zero-indexed; the API is one-indexed.
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [onlyOwing, setOnlyOwing] = useState<boolean | undefined>(undefined);
  // The single `PayVendorDialog` instance this page owns — see `PayableRowProps`
  // for why the row menu takes a callback instead of each row mounting its own
  // dialog.
  const [payingVendor, setPayingVendor] = useState<PayableRow | null>(null);
  // Which vendors show their bills. Several can be open at once, and they stay
  // open across a search or a page change, as they did in the table.
  const [openVendorIds, setOpenVendorIds] = useState<ReadonlySet<string>>(() => new Set());
  const toggleVendor = useCallback((row: PayableRow): void => {
    setOpenVendorIds((current) => {
      const next = new Set(current);
      if (next.has(row.vendorId)) next.delete(row.vendorId);
      else next.add(row.vendorId);
      return next;
    });
  }, []);

  const query = usePayables({
    search: search || undefined,
    onlyOwing,
    page: page + 1,
    limit: pageSize,
  });

  const rows = query.data?.data ?? [];
  const totals = query.data?.totals;
  // No figure until this search has answered: "₹0.00 owed to vendors" on a
  // slow or failed request reads as nothing owed. (Receivables does the same.)
  const pending = query.isError ? 'could not load' : 'loading…';
  // The totals follow the search (not the "Owing only" view), so say so.
  const searching = search.length > 0;

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  return (
    <CalmListPage
      // Three figures and the views would leave little room for the vendors.
      pinHeader={false}
      header={
        <>
          <ListTitle
            title="Payables"
            sub="What we owe vendors — bills taken on credit, less what has been paid. A net balance per vendor, not bill by bill."
          />

          <StatTiles label="Payables totals" className="mb-2.5 sm:grid-cols-3">
            <StatTile
              label="Total payable"
              value={totals ? formatPaise(totals.totalPayablePaise) : '—'}
              note={!totals ? pending : searching ? 'matching the search' : 'owed to vendors'}
            />
            <StatTile
              label="Vendors owed"
              value={totals ? String(totals.vendorsOwedCount) : '—'}
              note={!totals ? pending : searching ? 'matching the search' : 'with a balance due'}
            />
            <StatTile
              label="Advances paid"
              value={totals ? formatPaise(totals.advancePaise) : '—'}
              // The totals cover every vendor, but "Owing only" hides the vendors
              // holding an advance — so say so rather than show a figure the list
              // below cannot explain.
              note={
                !totals
                  ? pending
                  : onlyOwing
                    ? searching
                      ? 'matching the search, incl. ones this filter hides'
                      : 'all vendors, incl. ones this filter hides'
                    : searching
                      ? 'matching the search'
                      : 'paid ahead of bills'
              }
            />
          </StatTiles>

          {/* "Owing only" keeps vendors we owe money (`payable_paise > 0`). A
              vendor holding an advance from us is not one to pay, so it only
              shows under "All vendors". */}
          <SegmentCard label="Vendors by what is owed">
            <Segment
              pressed={!onlyOwing}
              onClick={() => {
                setOnlyOwing(undefined);
                setPage(0);
              }}
              count={null}
              label="All vendors"
            />
            <Segment
              pressed={Boolean(onlyOwing)}
              onClick={() => {
                setOnlyOwing(true);
                setPage(0);
              }}
              count={null}
              label="Owing only"
              dot="var(--ds-warning)"
            />
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
          searchPlaceholder="Search vendor name or code"
          searchLabel="Search vendors"
          // The payables API searches on any length.
          searchMinLength={1}
          filterColumns={NO_FILTER_COLUMNS}
          filters={NO_FILTERS}
          onFilterChange={ignoreFilters}
        />
      }
      error={
        query.isError ? (
          <ListError
            title="Couldn’t load payables"
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
          noun={VENDOR_NOUN}
          countUnknown={query.isError && !query.data}
        />
      }
      overlays={
        payingVendor ? (
          <PayVendorDialog open vendor={payingVendor} onClose={() => setPayingVendor(null)} />
        ) : null
      }
    >
      {query.isLoading ? (
        <ListSkeleton
          rows={SKELETON_ROWS}
          label="Loading vendors"
          renderRow={() => <PayableRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        query.isError ? null : searching ? (
          <ListEmpty title="No vendor matches" hint="Try another name or code." />
        ) : (
          <ListEmpty title="Nothing owed to anyone." />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            // Open a vendor to see the bills and payments behind their balance.
            <PayableRowCard
              key={row.vendorId}
              row={row}
              index={index}
              entering={entering}
              expanded={openVendorIds.has(row.vendorId)}
              onToggle={toggleVendor}
              onPay={setPayingVendor}
            />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
