'use client';

import { LinearProgress } from '@mui/material';
import { CustomerStatus } from '@tejas96/shared/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type Customer,
  useCustomerOverviewStats,
  useCustomers,
  useCustomerStats,
  useDeleteCustomer,
} from '../hooks/use-customers';
import { CustomerRow } from './list/customer-row';
import {
  normalizeCustomerFilterState,
  reconcileContradictoryCustomerFilters,
  toApiSortField,
  toApiSortOrder,
  toCustomerFilters,
} from './list/filter-adapters';
import { FocusPanel } from './list/focus-panel';
import { customerLinks } from './list/links';
import { ListHeader } from './list/list-header';
import { ListPager } from './list/list-pager';
import { ListSkeleton } from './list/list-skeleton';
import { ListEmpty, ListError } from './list/list-states';
import { ListToolbar } from './list/list-toolbar';
import { type RibbonWorklist, StatusRibbon } from './list/status-ribbon';
import { useFilterColumns } from './list/use-filter-columns';
import { useResellerNames } from './list/use-reseller-names';

import { ORG_ADMIN_ROLES } from '@/components/features/properties/utils/delete-eligibility';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: Customer[] = [];
const STATUS_VALUES: ReadonlySet<string> = new Set(Object.values(CustomerStatus));

/** How long the first paint's rise-in runs: the stagger per row plus the rise itself. */
const ENTRANCE_STAGGER_MS = 55;
const ENTRANCE_RISE_MS = 700;

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 25;

/**
 * /customers — one calm line per customer: who, how far along, the next
 * follow-up, the value. A row opens a focus panel with the sites and details.
 *
 * This file only wires state to the pieces in `./list`. Search, the status
 * ribbon, the filter popover, sorting, pagination and the `customers_*` URL
 * keys send exactly the API requests the previous table sent for the same URL.
 * Spec: docs/superpowers/specs/2026-10-10-customers-list-design.md
 */
export function CustomerListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deleteCustomerMutation = useDeleteCustomer();
  const deleteConfirmation = useDeleteConfirmation<Customer>({
    mutation: deleteCustomerMutation,
    getId: (customer) => customer.id,
  });

  const addCustomer = useGatedAction(
    'customers.create',
    () => {
      void router.push(customerLinks.addCustomer());
    },
    'Add customer',
  );

  const rawLeadTemperature = searchParams.get('leadTemperature');
  const initialFilters = useMemo(() => {
    if (!rawLeadTemperature || rawLeadTemperature === 'all') return undefined;
    return normalizeCustomerFilterState({ leadTemperature: rawLeadTemperature });
  }, [rawLeadTemperature]);

  // URL-synced state — the single source of truth for page, sort, filters and search.
  const urlState = useTableUrlState({ prefix: 'customers', defaultPageSize: 10, initialFilters });
  const { page, pageSize, search, sortModel, filters } = urlState.state;

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const handleFilterChange = useCallback(
    (nextFilters: TableUrlFilterRecord) => {
      const normalizedNext = normalizeCustomerFilterState(nextFilters);
      const prevFilters = filtersRef.current;
      const changedField = Object.keys({ ...prevFilters, ...normalizedNext }).find(
        (field) => prevFilters[field] !== normalizedNext[field],
      );
      urlState.setFilters(reconcileContradictoryCustomerFilters(normalizedNext, changedField));
    },
    [urlState.setFilters],
  );

  /**
   * The ribbon's status buttons write to the same `status` filter field the
   * popover uses — a shortcut into the filter model, never a second copy of it.
   */
  const activeStatus =
    typeof filters.status === 'string' && STATUS_VALUES.has(filters.status)
      ? (filters.status as CustomerStatus)
      : '';

  const handleStatusChange = useCallback(
    (key: string) => {
      const next = { ...filtersRef.current };
      if (key) next.status = key;
      else delete next.status;
      urlState.setFilters(reconcileContradictoryCustomerFilters(next, 'status'));
    },
    [urlState.setFilters],
  );

  /** The two worklists share one selection, as their chips did. */
  const activeWorklist: RibbonWorklist =
    filters.needsFollowup === 'true' || filters.needsFollowup === true
      ? 'needs-followup'
      : filters.hasActiveTickets === 'true'
        ? 'active-tickets'
        : '';

  const handleWorklistChange = useCallback(
    (key: RibbonWorklist) => {
      const next = { ...filtersRef.current };
      // Selecting either worklist clears the other — one selection.
      delete next.needsFollowup;
      delete next.hasActiveTickets;
      if (key === 'needs-followup') next.needsFollowup = 'true';
      else if (key === 'active-tickets') next.hasActiveTickets = 'true';
      urlState.setFilters(reconcileContradictoryCustomerFilters(next, key || undefined));
    },
    [urlState.setFilters],
  );

  // Ribbon counts: per-status, the overview's needs-follow-up, and customers
  // with an active ticket — counted by the same filtered query its button applies.
  const { data: statusStats } = useCustomerStats();
  const { data: overviewStats } = useCustomerOverviewStats();
  const { data: activeTicketCustomers } = useCustomers({ hasActiveTickets: true, limit: 1 });

  const filterColumns = useFilterColumns();
  const resellerNames = useResellerNames();

  // The list — driven entirely by URL state.
  const {
    data: customerData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCustomers({
    page: page + 1,
    limit: pageSize,
    search: search || undefined,
    sortBy: toApiSortField(sortModel),
    sortOrder: toApiSortOrder(sortModel),
    ...toCustomerFilters(filters),
  });

  const rows = customerData?.data ?? EMPTY_ROWS;

  const hasActiveFilters =
    search.length > 0 || Object.values(filters).some((value) => value !== '' && value != null);

  // ── Entrance: rows rise in once. Later changes swap in without replaying it. ──
  const [entered, setEntered] = useState(false);
  const hasRows = rows.length > 0;
  const rowCount = rows.length;
  useEffect(() => {
    if (entered || !hasRows) return undefined;
    const timer = setTimeout(
      () => setEntered(true),
      rowCount * ENTRANCE_STAGGER_MS + ENTRANCE_RISE_MS,
    );
    return () => clearTimeout(timer);
  }, [entered, hasRows, rowCount]);

  // ── Focus panel: one customer at a time, by id so it follows a refetch. ──
  const [openId, setOpenId] = useState<string | null>(null);
  const openCustomer = useMemo(
    () => (openId ? (rows.find((row) => row.id === openId) ?? null) : null),
    [openId, rows],
  );
  const handleOpen = useCallback((customer: Customer) => setOpenId(customer.id), []);
  const handleClose = useCallback(() => setOpenId(null), []);

  // A different page, search, sort or filter is a different list: close the panel.
  const viewKey = JSON.stringify([page, pageSize, search, sortModel, filters]);
  useEffect(() => {
    setOpenId(null);
  }, [viewKey]);

  // The customer left the list (deleted, or no longer matches): let go of it.
  useEffect(() => {
    if (openId && !isFetching && !openCustomer) setOpenId(null);
  }, [openId, isFetching, openCustomer]);

  return (
    <div className="-m-4 min-h-[calc(100vh-var(--header-height))] bg-surface-secondary text-[14px] leading-[1.45] text-foreground lg:-m-5">
      <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7 sm:pt-9">
        <ListHeader onAddCustomer={addCustomer.onGatedClick} canAddCustomer={addCustomer.allowed} />

        <StatusRibbon
          stats={statusStats}
          needsFollowupCount={overviewStats?.needsFollowup}
          activeTicketsCount={activeTicketCustomers?.meta?.total}
          activeStatus={activeStatus}
          activeWorklist={activeWorklist}
          onStatusChange={handleStatusChange}
          onWorklistChange={handleWorklistChange}
        />

        <div className="mb-2.5 mt-[18px]">
          <ListToolbar
            search={search}
            onSearchChange={urlState.setSearch}
            searchPlaceholder="Search name, phone, consumer no., site code"
            filterColumns={filterColumns}
            filters={filters}
            onFilterChange={handleFilterChange}
            sortModel={sortModel}
            onSortChange={urlState.setSortModel}
          />
        </div>

        {isError ? (
          <ListError message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : null}

        <div className="relative @container" aria-busy={isFetching}>
          {/* Background refetch: the rows stay; only this thin bar shows. Always
              mounted so toggling it never moves the list. */}
          <LinearProgress
            aria-hidden={!(isFetching && !isLoading)}
            sx={{
              position: 'absolute',
              insetInline: 8,
              top: -6,
              height: 2,
              borderRadius: 'var(--radius-pill)',
              opacity: isFetching && !isLoading ? 1 : 0,
              transition: 'opacity 200ms ease',
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
                '& .MuiLinearProgress-bar': { animation: 'none' },
              },
            }}
          />

          {isLoading ? (
            <ListSkeleton rows={Math.min(pageSize, MAX_SKELETON_ROWS)} />
          ) : rows.length === 0 ? (
            isError ? null : (
              <ListEmpty
                filtered={hasActiveFilters}
                onClearFilters={urlState.resetAll}
                onAddCustomer={addCustomer.onGatedClick}
                canAddCustomer={addCustomer.allowed}
              />
            )
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((customer, index) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  index={index}
                  entering={!entered}
                  selected={customer.id === openId}
                  resellerName={
                    customer.resellerId ? resellerNames.get(customer.resellerId) : undefined
                  }
                  showDelete={isOrgAdmin}
                  onOpen={handleOpen}
                  onRequestDelete={deleteConfirmation.requestDelete}
                />
              ))}
            </div>
          )}
        </div>

        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={customerData?.meta.total ?? 0}
          onPageChange={urlState.setPage}
          onPageSizeChange={urlState.setPageSize}
          countUnknown={isError && !customerData}
        />
      </div>

      <FocusPanel customer={openCustomer} resellerNames={resellerNames} onClose={handleClose} />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Customer"
        itemName={
          [deleteConfirmation.target?.firstName, deleteConfirmation.target?.lastName]
            .filter(Boolean)
            .join(' ') || 'this customer'
        }
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />
    </div>
  );
}
