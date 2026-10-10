'use client';

import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import { Button } from '@mui/material';
import { QuoteStatus } from '@tejas96/shared/types';
import {
  DEAL_ATTENTION_LABELS,
  DEAL_ATTENTIONS,
  DEAL_STAGE_FILTERS,
  DEAL_STAGE_LABELS,
  leadSourceLabel,
} from '@tejas96/shared/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useEffect, useMemo } from 'react';

import { QUOTE_STATUS_LABELS } from '../constants';
import type { QuoteListItem } from '../hooks';
import { QuoteRow, QuoteRowSkeleton } from './list/quote-row';

import { useEmployees } from '@/components/features/projects/hooks/use-employees';
import { FilterAutocomplete, type ColumnConfig } from '@/components/shared/advanced-table';
import {
  CalmListPage,
  createSortIndex,
  ListEmpty,
  ListError,
  ListPager,
  ListSkeleton,
  ListTitle,
  ListToolbar,
  PrimaryAction,
  type SortOption,
  useListEntrance,
} from '@/components/shared/calm-list';
import { MUIDateRangePicker } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { useTableUrlState, type TableUrlFilterRecord } from '@/lib/hooks';
import {
  useQuoteLeadSources,
  useQuoteListResource,
  type QuoteListFilters,
} from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { formatBusinessDate, formatLocalDate, formatNumber, getErrorMessage } from '@/lib/utils';

// The filter panel's ColumnConfig requires TRow extends Record<string, unknown>.
// QuoteListItem has explicit typed fields, so we widen it here for the filter columns only.
type QuoteRow = QuoteListItem & Record<string, unknown>;

const EMPTY_ROWS: QuoteListItem[] = [];

const STATUS_OPTIONS = Object.values(QuoteStatus).map((value) => ({
  value,
  label: QUOTE_STATUS_LABELS[value],
}));

/** One page large enough for every employee profile. */
const EMPLOYEES_ALL = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Adapter functions — pure, module-level, no React deps
// ============================================================================

// Maps column field names → backend QuoteSortField enum values.
// Required when the column field name differs from the backend enum value string.
const COLUMN_TO_SORT_FIELD: Record<string, string> = {
  finalPrice: 'finalPrice',
  effectivePrice: 'effectivePrice',
  systemSizeKw: 'systemSizeKw',
  status: 'status',
  quoteDate: 'quoteDate',
  validUntil: 'validUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  customerName: 'customerName',
};

function toApiSortField(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): string | undefined {
  if (!model) return undefined;
  // Use explicit map to avoid sending unknown field names to the backend
  return COLUMN_TO_SORT_FIELD[model.field] ?? undefined;
}

function toApiSortOrder(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): 'ASC' | 'DESC' {
  return model?.direction === 'asc' ? 'ASC' : 'DESC';
}

function toLocalDateString(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateToUtcDayRange(localDate: string): { fromIso: string; toIso: string } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) return undefined;
  const yy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  return {
    fromIso: new Date(yy, mm - 1, dd, 0, 0, 0, 0).toISOString(),
    toIso: new Date(yy, mm - 1, dd, 23, 59, 59, 999).toISOString(),
  };
}

/** A real calendar day as `YYYY-MM-DD` — `2026-02-31` has the shape but is not one. */
function isRealDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** A trimmed non-empty string, else undefined. */
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Most sources the API takes in `leadSourceNotIn` (the dashboard sends its top 4). */
const MAX_EXCLUDED_SOURCES = 20;

/**
 * `leadSourceNotIn` as stored in the URL: a JSON array of sources, never a
 * comma list (real sources contain commas). Anything else is junk.
 */
function leadSourceList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .slice(0, MAX_EXCLUDED_SOURCES);
  return list.length > 0 ? list : undefined;
}

function toQuoteFilters(filters: TableUrlFilterRecord): Partial<QuoteListFilters> {
  // The date picker emits YYYY-MM-DD (local date, no time component).
  // We expand it to a full UTC day range so the backend's quoteDate range filter
  // covers the entire selected day in the user's local timezone (IST / UTC+5:30).
  const createdAtRaw =
    typeof filters.createdAt === 'string' && filters.createdAt
      ? toLocalDateString(filters.createdAt)
      : undefined;
  const createdAtRange = createdAtRaw ? localDateToUtcDayRange(createdAtRaw) : undefined;

  // Dashboard drill-downs. Unknown values are dropped, so the API never sees them.
  const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : undefined;
  const range = (value: unknown): { from?: string; to?: string } => {
    const r = (value ?? {}) as { from?: unknown; to?: unknown };
    return { from: isRealDay(r.from) ? r.from : undefined, to: isRealDay(r.to) ? r.to : undefined };
  };
  const newDate = range(filters.newDate);
  const wonDate = range(filters.wonDate);
  const lostDate = range(filters.lostDate);

  return {
    status:
      typeof filters.status === 'string' && filters.status
        ? (filters.status as QuoteStatus)
        : undefined,
    fromDate: createdAtRange?.fromIso,
    toDate: (typeof filters.toDate === 'string' && filters.toDate) || createdAtRange?.toIso,
    stage: pick(filters.stage, DEAL_STAGE_FILTERS),
    attention: pick(filters.attention, DEAL_ATTENTIONS),
    person:
      typeof filters.person === 'string' && UUID.test(filters.person) ? filters.person : undefined,
    financing: pick(filters.financing, ['cash', 'loan'] as const),
    leadSource: text(filters.leadSource),
    leadSourceNotIn: leadSourceList(filters.leadSourceNotIn),
    newFrom: newDate.from,
    newTo: newDate.to,
    wonFrom: wonDate.from,
    wonTo: wonDate.to,
    lostFrom: lostDate.from,
    lostTo: lostDate.to,
  };
}

// ============================================================================
// Sort (what the table's column headers offered)
// ============================================================================

/**
 * The four sortable columns of the old table, both directions. The models are
 * the same `{ field, direction }` values the headers wrote, so a saved
 * `quotes_sort` URL still means what it meant.
 */
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', model: null },
  { label: 'Oldest first', model: { field: 'createdAt', direction: 'asc' } },
  { label: 'Customer A–Z', model: { field: 'customerName', direction: 'asc' } },
  { label: 'Customer Z–A', model: { field: 'customerName', direction: 'desc' } },
  { label: 'Value: high to low', model: { field: 'finalPrice', direction: 'desc' } },
  { label: 'Value: low to high', model: { field: 'finalPrice', direction: 'asc' } },
  { label: 'System: large to small', model: { field: 'systemSizeKw', direction: 'desc' } },
  { label: 'System: small to large', model: { field: 'systemSizeKw', direction: 'asc' } },
];

/** No sort, or a field the API does not know, is the created date (`toApiSortField`). */
const sortIndex = createSortIndex(SORT_OPTIONS, 'createdAt');

const QUOTE_NOUN = { one: 'quote', many: 'quotes' };

/** A screenful; a longer page does not need a longer placeholder. */
const MAX_SKELETON_ROWS = 25;

// ============================================================================
// Filter panel (filter-only fields — the dashboard's links land on these)
// ============================================================================

/** Chip text for a { from, to } day range: "1 Sep 2026 – 30 Sep 2026", "From …" or "Until …". */
function formatDayRange(value: unknown): string {
  const { from, to } = (value ?? {}) as { from?: string; to?: string };
  if (from && to) return `${formatBusinessDate(from)} – ${formatBusinessDate(to)}`;
  if (from) return `From ${formatBusinessDate(from)}`;
  if (to) return `Until ${formatBusinessDate(to)}`;
  return '';
}

const STAGE_FILTER_OPTIONS = DEAL_STAGE_FILTERS.map((s) => ({
  label: DEAL_STAGE_LABELS[s],
  value: s,
}));
const ATTENTION_OPTIONS = DEAL_ATTENTIONS.map((a) => ({
  label: DEAL_ATTENTION_LABELS[a],
  value: a,
}));
const DAY_RANGE_KEYS: readonly string[] = ['newDate', 'wonDate', 'lostDate'];

const FILTER_COLUMNS: ColumnConfig<QuoteRow>[] = [
  {
    field: 'status',
    headerName: 'Quote status',
    filterable: true,
    filterType: 'select',
    filterOptions: STATUS_OPTIONS,
  },
  {
    field: 'stage',
    headerName: 'Deal stage',
    filterable: true,
    filterType: 'select',
    filterOptions: STAGE_FILTER_OPTIONS,
  },
  {
    field: 'attention',
    headerName: 'Needs action',
    filterable: true,
    filterType: 'select',
    filterOptions: ATTENTION_OPTIONS,
  },
  // Options are the employees list, injected at render time.
  {
    field: 'person',
    headerName: 'Made by',
    filterable: true,
    filterType: 'select',
    filterOptions: [],
  },
  {
    field: 'financing',
    headerName: 'Cash / loan',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Cash', value: 'cash' },
      { label: 'Loan', value: 'loan' },
    ],
  },
  // Options are GET /quotes/lead-sources, injected at render time.
  {
    field: 'leadSource',
    headerName: 'Lead source',
    filterable: true,
    filterType: 'select',
    filterOptions: [],
    formatFilterValue: (v) => leadSourceLabel(String(v ?? '')),
  },
  // Not a control in the panel: only the dashboard's "Other" row sets it, and
  // it shows as a removable chip.
  {
    field: 'leadSourceNotIn',
    headerName: 'Lead source',
    filterable: false,
    formatFilterValue: (v) =>
      `other than ${(leadSourceList(v) ?? []).map(leadSourceLabel).join(', ')}`,
  },
  { field: 'createdAt', headerName: 'Created on', filterable: true, filterType: 'date' },
  {
    field: 'newDate',
    headerName: 'New deal between',
    filterable: true,
    formatFilterValue: formatDayRange,
  },
  {
    field: 'wonDate',
    headerName: 'Won between',
    filterable: true,
    formatFilterValue: formatDayRange,
  },
  {
    field: 'lostDate',
    headerName: 'Lost between',
    filterable: true,
    formatFilterValue: formatDayRange,
  },
];

/**
 * The URL record with every value the list would ignore taken out, so a chip
 * never claims a filter that is not applied (`quotes_filters={"stage":"bogus"}`
 * must not show "Deal stage: bogus"). Select filters keep only values that are
 * one of their options (`person` only a user id), day ranges keep only real
 * days. Returns the same object when nothing was dropped.
 */
function sanitizeUrlFilters(filters: TableUrlFilterRecord): TableUrlFilterRecord {
  const result: TableUrlFilterRecord = {};
  let changed = false;
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'person') {
      if (typeof value === 'string' && UUID.test(value)) result[key] = value;
      else changed = true;
      continue;
    }
    // Its options load after the first render; any non-empty source is a real filter.
    if (key === 'leadSource') {
      if (text(value)) result[key] = value;
      else changed = true;
      continue;
    }
    if (key === 'leadSourceNotIn') {
      const list = leadSourceList(value);
      if (list) result[key] = list;
      if (JSON.stringify(list) !== JSON.stringify(value)) changed = true;
      continue;
    }
    if (DAY_RANGE_KEYS.includes(key)) {
      const { from, to } = (typeof value === 'object' && value !== null ? value : {}) as {
        from?: unknown;
        to?: unknown;
      };
      const kept: { from?: string; to?: string } = {};
      if (isRealDay(from)) kept.from = from;
      if (isRealDay(to)) kept.to = to;
      if (kept.from !== undefined || kept.to !== undefined) result[key] = kept;
      // Anything but exactly the kept shape (a string, unknown keys, a bad end)
      // is junk the list ignores, so the URL is rewritten without it.
      if (JSON.stringify(kept) !== JSON.stringify(value)) changed = true;
      continue;
    }
    const column = FILTER_COLUMNS.find((c) => c.field === key);
    if (column?.filterType === 'select' && column.filterOptions) {
      if (
        typeof value === 'string' &&
        column.filterOptions.some((o) => String(o.value) === value)
      ) {
        result[key] = value;
      } else {
        changed = true;
      }
      continue;
    }
    result[key] = value;
  }
  return changed ? result : filters;
}

function DateRangeFilter({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}): JSX.Element {
  const range = (value ?? {}) as { from?: string; to?: string };
  return (
    <MUIDateRangePicker
      fromDate={range.from ?? null}
      toDate={range.to ?? null}
      onFromChange={(d) => onChange({ ...range, from: formatLocalDate(d) || undefined })}
      onToChange={(d) => onChange({ ...range, to: formatLocalDate(d) || undefined })}
    />
  );
}

// ============================================================================
// Main component
// ============================================================================

export function QuoteListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Shared by both empty states below. `/quotes/new` is route-gated too, but a
  // button that navigates to a deny page is a worse answer than one that says
  // which permission is missing without leaving the list.
  const createQuote = useGatedAction(
    'quotes.create',
    () => void router.push(ROUTES.QUOTES.NEW),
    'Create quote',
  );

  // Bridge bare `?status=draft` sidebar links into the table's initial filter state.
  // Sidebar nav uses unprefixed params; useTableUrlState only reads prefixed keys
  // (quotes_filters). We pass initialFilters so the very first render is already
  // filtered — no post-mount effect, no race condition, no hard-refresh needed.
  const rawStatusParam = searchParams.get('status');
  const rawToDateParam = searchParams.get('toDate');

  const initialFilters = useMemo(() => {
    const filters: TableUrlFilterRecord = {};
    if (rawStatusParam) filters.status = rawStatusParam;
    if (rawToDateParam) filters.toDate = rawToDateParam;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [rawStatusParam, rawToDateParam]);

  // URL-synced table state — single source of truth for all pagination/sort/filter/search
  const urlState = useTableUrlState({ prefix: 'quotes', defaultPageSize: 10, initialFilters });

  // A link can carry filter values the list ignores; show and send only what it
  // applies, and rewrite the URL to match (replace, no new history entry —
  // `setFilters` uses `replaceState`). Once rewritten the record is stable, so
  // this runs once.
  const { setFilters: replaceUrlFilters } = urlState;
  const filters = useMemo(
    () => sanitizeUrlFilters(urlState.state.filters),
    [urlState.state.filters],
  );
  useEffect(() => {
    if (filters !== urlState.state.filters) replaceUrlFilters(filters);
  }, [filters, replaceUrlFilters, urlState.state.filters]);

  // "Made by" options — the same employees list the project list's team filter uses.
  // Every status (people who left still made quotes); GET /employees has no max,
  // so one page of EMPLOYEES_ALL is everyone (61 profiles today).
  const { data: employeesData } = useEmployees({ limit: EMPLOYEES_ALL });
  const employeeOptions = useMemo(() => {
    return (
      employeesData?.items.map((emp) => ({
        label:
          `${emp.user?.firstName ?? ''} ${emp.user?.lastName ?? ''}`.trim() ||
          emp.email ||
          'Unknown',
        value: emp.userId,
      })) ?? []
    );
  }, [employeesData?.items]);

  const { data: leadSources } = useQuoteLeadSources();
  const leadSourceOptions = useMemo(
    () => (leadSources ?? []).map((value) => ({ value, label: leadSourceLabel(value) })),
    [leadSources],
  );

  const filterColumns = useMemo<ColumnConfig<QuoteRow>[]>(() => {
    return FILTER_COLUMNS.map((col) => {
      if (col.field === 'leadSource') {
        return {
          ...col,
          filterOptions: leadSourceOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={leadSourceOptions}
              value={value}
              onChange={onChange}
              placeholder="Search source…"
            />
          ),
        };
      }
      if (col.field === 'person') {
        return {
          ...col,
          filterOptions: employeeOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={employeeOptions}
              value={value}
              onChange={onChange}
              placeholder="Search person…"
            />
          ),
        };
      }
      if (DAY_RANGE_KEYS.includes(col.field)) {
        return {
          ...col,
          filterWide: true,
          renderFilter: ({ value, onChange }) => (
            <DateRangeFilter value={value} onChange={onChange} />
          ),
        };
      }
      return col;
    });
  }, [employeeOptions, leadSourceOptions]);

  // Server-side data fetch — driven entirely by URL state via FDAL resource hook
  const {
    data: quoteData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuoteListResource({
    page: urlState.state.page + 1,
    limit: urlState.state.pageSize,
    search: urlState.state.search || undefined,
    sortBy: toApiSortField(urlState.state.sortModel),
    sortOrder: toApiSortOrder(urlState.state.sortModel),
    ...toQuoteFilters(filters),
  });

  const rows = quoteData?.data ?? EMPTY_ROWS;
  const { page, pageSize, search, sortModel } = urlState.state;

  const hasActiveFilters =
    search.length > 0 || Object.values(filters).some((value) => value !== '' && value != null);

  // Said in the filter panel, so the effect of a filter shows without looking away.
  const total = quoteData?.meta.total;
  const resultLabel =
    total === undefined ? undefined : `${formatNumber(total)} ${total === 1 ? 'quote' : 'quotes'}`;

  // Rows rise in once. Later changes swap in without replaying it.
  const entering = useListEntrance(rows.length);

  return (
    <CalmListPage
      header={
        <ListTitle
          title="Quotations"
          sub="Create and manage customer quotations"
          actions={
            <>
              <Button variant="outlined" size="small" startIcon={<UploadIcon />} disabled>
                Export
              </Button>
              <PrimaryAction onClick={createQuote.onGatedClick} allowed={createQuote.allowed}>
                + Create quote
              </PrimaryAction>
            </>
          }
        />
      }
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={urlState.setSearch}
          searchPlaceholder="Search quote, name, phone"
          searchLabel="Search quotes"
          filterColumns={filterColumns}
          filters={filters}
          onFilterChange={urlState.setFilters}
          sortOptions={SORT_OPTIONS}
          sortActiveIndex={sortIndex}
          sortModel={sortModel}
          onSortChange={urlState.setSortModel}
          resultLabel={resultLabel}
        />
      }
      error={
        isError ? (
          <ListError
            title="Failed to load quotes"
            message={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : null
      }
      isFetching={isFetching}
      isLoading={isLoading}
      footer={
        <ListPager
          page={page}
          pageSize={pageSize}
          totalRowCount={quoteData?.meta.total ?? 0}
          onPageChange={urlState.setPage}
          onPageSizeChange={urlState.setPageSize}
          noun={QUOTE_NOUN}
          countUnknown={isError && !quoteData}
        />
      }
    >
      {isLoading ? (
        <ListSkeleton
          rows={Math.min(pageSize, MAX_SKELETON_ROWS)}
          label="Loading quotes"
          renderRow={() => <QuoteRowSkeleton />}
        />
      ) : rows.length === 0 ? (
        isError ? null : hasActiveFilters ? (
          <ListEmpty
            title="No quotes match"
            hint="Try another quote number, name or filter."
            action={
              <Button size="small" variant="outlined" onClick={urlState.resetAll} sx={{ mt: 0.5 }}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <ListEmpty
            title="No quotes yet"
            hint="Get started by creating your first quote."
            action={
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={createQuote.onGatedClick}
                aria-disabled={!createQuote.allowed}
                sx={{ mt: 0.5, opacity: createQuote.allowed ? 1 : 0.5 }}
              >
                Create Quote
              </Button>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((quote, index) => (
            <QuoteRow key={quote.id} quote={quote} index={index} entering={entering} />
          ))}
        </div>
      )}
    </CalmListPage>
  );
}
