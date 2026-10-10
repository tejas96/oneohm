'use client';

import { LinearProgress } from '@mui/material';
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
import { MAX_STAGGER_STEPS, STAGGER_MS } from './list/row-layout';
import { type RibbonWorklist, StatusRibbon } from './list/status-ribbon';
import { useFilterColumns } from './list/use-filter-columns';
import { useResellerNames } from './list/use-reseller-names';

import { ORG_ADMIN_ROLES } from '@/components/features/properties/utils/delete-eligibility';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useGatedAction } from '@/lib/rbac';
import { cn, getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const EMPTY_ROWS: Customer[] = [];

/** The rise itself, after the last row's stagger delay. */
const ENTRANCE_RISE_MS = 700;

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 25;

/**
 * The header stays in view while the list scrolls.
 *
 * In a desktop-size window (1024 wide and 700 tall, or more) the whole block
 * pins: title, numbers ribbon and search bar. In a smaller window that block
 * would cover most of the screen, so it is `display: contents` there and only
 * the search bar pins. Both pin under the global header, like the detail pages'
 * tab rails. The page colour behind them hides the rows that scroll under, and
 * the side bleed covers the rows' shadows.
 */
const PINNED_HEADER = cn(
  'contents',
  '[@media(min-width:1024px)_and_(min-height:700px)]:sticky',
  '[@media(min-width:1024px)_and_(min-height:700px)]:top-[var(--header-height)]',
  '[@media(min-width:1024px)_and_(min-height:700px)]:z-10',
  '[@media(min-width:1024px)_and_(min-height:700px)]:-mx-7',
  '[@media(min-width:1024px)_and_(min-height:700px)]:-mt-3',
  '[@media(min-width:1024px)_and_(min-height:700px)]:block',
  '[@media(min-width:1024px)_and_(min-height:700px)]:bg-surface-secondary',
  '[@media(min-width:1024px)_and_(min-height:700px)]:px-7',
  '[@media(min-width:1024px)_and_(min-height:700px)]:pt-3',
);
const PINNED_TOOLBAR =
  'sticky top-[var(--header-height)] z-10 -mx-4 mt-2.5 bg-surface-secondary px-4 pb-2.5 pt-2 sm:-mx-7 sm:px-7';

/** A link or button in a row that takes keyboard focus scrolls clear of the pinned header. */
const ROW_FOCUS_CLEARS_PINNED = cn(
  '[--row-scroll-mt:calc(var(--header-height)+var(--customers-pinned-h,0px)+12px)]',
  '[&_a]:scroll-mt-[var(--row-scroll-mt)] [&_button]:scroll-mt-[var(--row-scroll-mt)]',
);

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
  const activeStatus = typeof filters.status === 'string' ? filters.status : '';

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
      Math.min(rowCount, MAX_STAGGER_STEPS) * STAGGER_MS + ENTRANCE_RISE_MS,
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

  // ── Pinned header: its height is published so a row that takes keyboard
  // focus is scrolled clear of it, never underneath (ROW_FOCUS_CLEARS_PINNED). ──
  const pageRef = useRef<HTMLDivElement>(null);
  const pinnedHeaderRef = useRef<HTMLDivElement>(null);
  const pinnedToolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pageEl = pageRef.current;
    const headerEl = pinnedHeaderRef.current;
    const toolbarEl = pinnedToolbarRef.current;
    if (!pageEl || !headerEl || !toolbarEl) return undefined;
    const publish = (): void => {
      // The whole header is `display: contents` (height 0) when only the bar pins.
      const pinned = headerEl.offsetHeight || toolbarEl.offsetHeight;
      pageEl.style.setProperty('--customers-pinned-h', `${pinned}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(headerEl);
    observer.observe(toolbarEl);
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, []);

  return (
    <div
      ref={pageRef}
      className="-m-4 min-h-[calc(100vh-var(--header-height))] bg-surface-secondary text-[14px] leading-[1.45] text-foreground lg:-m-5"
    >
      <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-7 sm:pt-9">
        <div ref={pinnedHeaderRef} className={PINNED_HEADER}>
          <ListHeader
            onAddCustomer={addCustomer.onGatedClick}
            canAddCustomer={addCustomer.allowed}
          />

          <StatusRibbon
            stats={statusStats}
            needsFollowupCount={overviewStats?.needsFollowup}
            activeTicketsCount={activeTicketCustomers?.meta?.total}
            activeStatus={activeStatus}
            activeWorklist={activeWorklist}
            onStatusChange={handleStatusChange}
            onWorklistChange={handleWorklistChange}
          />

          <div ref={pinnedToolbarRef} className={PINNED_TOOLBAR}>
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
            {/* Background refetch: the rows stay; only this thin bar shows. Always
                mounted so toggling it never moves the list. It rides on the pinned
                bar, so it shows while the list is scrolled too. */}
            <LinearProgress
              aria-hidden={!(isFetching && !isLoading)}
              sx={{
                position: 'absolute',
                insetInline: { xs: 24, sm: 36 },
                bottom: 4,
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
          </div>
        </div>

        {isError ? (
          <ListError message={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : null}

        <div className={cn('@container', ROW_FOCUS_CLEARS_PINNED)} aria-busy={isFetching}>
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
