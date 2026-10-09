'use client';

import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import AlertIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UploadIcon from '@mui/icons-material/Upload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import { type DealStage, QuoteStatus } from '@tejas96/shared/types';
import {
  DEAL_ATTENTION_LABELS,
  DEAL_ATTENTIONS,
  DEAL_STAGE_FILTERS,
  DEAL_STAGE_LABELS,
  indiaToday,
  leadSourceLabel,
} from '@tejas96/shared/utils';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { QUOTE_STATUS_LABELS } from '../constants';
import { useDeleteQuote, type QuoteListItem } from '../hooks';
import { QuoteStatusDropdown } from './quote-status-dropdown';
import { VoidQuoteDialog } from './void-quote-dialog';

import { useEmployees } from '@/components/features/projects/hooks/use-employees';
import { FilterAutocomplete, type ColumnConfig } from '@/components/shared/advanced-table';
import { CrmTable, type CrmColumn } from '@/components/shared/crm-table';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { MUIDateRangePicker } from '@/components/ui';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { showToast } from '@/components/ui/sonner';
import { SystemSizeDisplay } from '@/components/ui/system-size-display';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useTableUrlState, type TableUrlFilterRecord } from '@/lib/hooks';
import {
  useQuoteLeadSources,
  useQuoteListResource,
  type QuoteListFilters,
} from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { crm } from '@/lib/theme/tokens';
import { formatBusinessDate, formatCurrency, formatLocalDate, getErrorMessage } from '@/lib/utils';

// The filter panel's ColumnConfig requires TRow extends Record<string, unknown>.
// QuoteListItem has explicit typed fields, so we widen it here for table usage only.
type QuoteRow = QuoteListItem & Record<string, unknown>;

const EMPTY_ROWS: QuoteRow[] = [];

const STATUS_OPTIONS = Object.values(QuoteStatus).map((value) => ({
  value,
  label: QUOTE_STATUS_LABELS[value],
}));

/** The grid has no column gap: text cells keep a right gutter so neighbours never touch. */
const CELL_GUTTER = { pr: 2 } as const;

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
// Row Actions Menu (private sub-component)
// ============================================================================

function RowActionsMenu({ quote }: { quote: QuoteRow }): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteQuoteMutation = useDeleteQuote();

  const handleClose = (): void => setAnchorEl(null);
  const removeQuote = useGatedAction('quotes.delete', () => undefined, 'Delete quote');

  const handleDelete = (): void => {
    handleClose();
    if (!removeQuote.allowed) {
      removeQuote.onGatedClick();
      return;
    }
    setDeleteOpen(true);
  };

  const confirmDelete = (): void => {
    deleteQuoteMutation.mutate(quote.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        showToast.success('Quote deleted');
      },
      onError: (err) => showToast.error(getErrorMessage(err)),
    });
  };

  const handleVoid = (): void => {
    handleClose();
    if (!removeQuote.allowed) {
      removeQuote.onGatedClick();
      return;
    }
    setVoidOpen(true);
  };

  /*
    Same split as the quote detail header: a draft is deletable because nobody
    outside the office has seen it, and anything already in front of the
    customer is voidable instead - deleting it would leave them holding a PDF
    and a notification pointing at a row that no longer answers.

    Both sit behind `quotes.delete`. Void is the gentler of the two (it keeps
    the quote), so it needs no permission of its own, and a new permission code
    would start out granted to nobody and read as a missing button.
  */
  const isVoided = Boolean(quote.voidedAt);
  const canDelete = !isVoided && quote.status === QuoteStatus.DRAFT;
  const canVoid =
    !isVoided && (quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget as HTMLElement);
        }}
        aria-label="Row actions"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id }));
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>

        {canDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <AlertIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Delete
          </MenuItem>
        )}

        {canVoid && (
          <MenuItem onClick={handleVoid} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <BlockIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Void
          </MenuItem>
        )}
      </Menu>

      <DeleteConfirmationDialog
        open={deleteOpen}
        title="Delete quote"
        itemName={quote.quoteNumber}
        permanent={false}
        isPending={deleteQuoteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />

      <VoidQuoteDialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        quoteId={quote.id}
        quoteNumber={quote.quoteNumber}
        customerName={quote.customerName}
      />
    </>
  );
}

// ============================================================================
// Stage cell — a calm dot + label, the same colors as the dashboard's stage blocks
// ============================================================================

const STAGE_TONE: Record<DealStage, string> = {
  drafting: 'var(--ds-neutral-300)',
  waiting: 'var(--ds-primary-light)',
  quiet: 'var(--ds-danger)',
  won: 'var(--ds-primary)',
  lost: 'var(--ds-neutral-300)',
};

function StageCell({ stage }: { stage: DealStage | null | undefined }): JSX.Element {
  if (!stage) return <MUITypography variant="placeholder">-</MUITypography>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary">
      <span
        aria-hidden="true"
        className="inline-block size-2 rounded-full"
        style={{ background: STAGE_TONE[stage] }}
      />
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}

// ============================================================================
// Column definitions (module-level — never recreated on render)
// ============================================================================

const CRM_COLUMNS: CrmColumn<QuoteRow>[] = [
  {
    field: 'quoteNumber',
    header: 'Quote #',
    track: crm['col-quote-number'],
    // Not sortable: the API has no quote-number sort, so the arrow would do nothing.
    // A little left padding (header moves with it) so the code is not flush with the card edge.
    cellSx: { ...CELL_GUTTER, pl: 0.5 },
    renderCell: (row) => (
      <MuiLink
        component={NextLink}
        href={buildRoute(ROUTES.QUOTES.DETAIL, { id: row.id })}
        prefetch={false}
        underline="hover"
        onClick={(e) => e.stopPropagation()}
        sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
      >
        {row.quoteNumber}
      </MuiLink>
    ),
  },
  {
    field: 'customerName',
    header: 'Customer',
    track: crm['col-customer'],
    sortable: true,
    cellSx: CELL_GUTTER,
    renderCell: (row) => {
      const name = row.customerName ?? 'Unknown';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <MUIAvatar name={name} size="sm" sx={{ flexShrink: 0 }} />
          <MUITypography variant="bodyPrimary" noWrap sx={{ fontWeight: 500 }}>
            {name}
          </MUITypography>
        </Box>
      );
    },
  },
  {
    field: 'propertyName',
    header: 'Property',
    track: crm['col-quote-property'],
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <MUITypography variant="body" noWrap>
        {row.propertyName ?? '-'}
      </MUITypography>
    ),
  },
  {
    field: 'systemSizeKw',
    header: 'System',
    track: crm['col-quote-system'],
    sortable: true,
    renderCell: (row) => <SystemSizeDisplay kw={row.systemSizeKw} layout="stacked" />,
  },
  {
    field: 'finalPrice',
    header: 'Value',
    track: crm['col-quote-value'],
    sortable: true,
    align: 'right',
    cellSx: CELL_GUTTER,
    renderCell: (row) => (
      <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
        {row.finalPrice != null ? formatCurrency(row.finalPrice) : '-'}
      </MUITypography>
    ),
  },
  {
    field: 'dealStage',
    header: 'Stage',
    track: crm['col-quote-stage'],
    renderCell: (row) => <StageCell stage={row.dealStage} />,
  },
  {
    field: 'status',
    header: 'Status',
    track: crm['col-quote-status'],
    stopPropagation: true,
    renderCell: (row) => (
      <QuoteStatusDropdown
        quoteId={row.id}
        status={row.status}
        voidedAt={row.voidedAt}
        voidReason={row.voidReason}
        size="xs"
      />
    ),
  },
  {
    field: 'createdAt',
    header: 'Created',
    track: crm['col-quote-date'],
    sortable: true,
    renderCell: (row) =>
      row.createdAt ? (
        <MUITypography variant="body" sx={{ whiteSpace: 'nowrap' }}>
          {formatBusinessDate(row.createdAt)}
        </MUITypography>
      ) : (
        <MUITypography variant="placeholder">-</MUITypography>
      ),
  },
  {
    field: 'validUntil',
    header: 'Valid until',
    track: crm['col-quote-date'],
    sortable: true,
    renderCell: (row) => {
      if (!row.validUntil) return <MUITypography variant="placeholder">-</MUITypography>;
      // Same rule as the deal stage: valid through the whole of its last IST day.
      const isExpired = row.validUntil.slice(0, 10) < indiaToday();
      return (
        <MUIStatusChip
          label={formatBusinessDate(row.validUntil)}
          color={isExpired ? 'error' : 'default'}
        />
      );
    },
  },
  {
    field: 'actions',
    header: '',
    track: crm['col-actions'],
    align: 'right',
    hideable: false,
    stopPropagation: true,
    renderCell: (row) => <RowActionsMenu quote={row} />,
  },
];

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

  const tableRows = useMemo<QuoteRow[]>(
    () => (quoteData?.data as QuoteRow[] | undefined) ?? EMPTY_ROWS,
    [quoteData?.data],
  );

  const renderEmptyState = useCallback(
    (hasActiveFilters: boolean): JSX.Element =>
      hasActiveFilters ? (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <MUITypography variant="body">No quotes match your search and filters.</MUITypography>
          <Button size="small" variant="outlined" onClick={urlState.resetAll}>
            Clear all filters
          </Button>
        </Box>
      ) : (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <MUITypography variant="body">
            No quotes yet. Get started by creating your first quote.
          </MUITypography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createQuote.onGatedClick}
            aria-disabled={!createQuote.allowed}
            sx={{ opacity: createQuote.allowed ? 1 : 0.5 }}
          >
            Create Quote
          </Button>
        </Box>
      ),
    [createQuote.allowed, createQuote.onGatedClick, urlState.resetAll],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <MUITypography variant="drawerTitle" component="h1">
            Quotations
          </MUITypography>
          <MUITypography variant="body" sx={{ mt: 0.25 }}>
            Create and manage customer quotations
          </MUITypography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button variant="outlined" size="small" startIcon={<UploadIcon />} disabled>
            Export
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={createQuote.onGatedClick}
            aria-disabled={!createQuote.allowed}
            sx={{ opacity: createQuote.allowed ? 1 : 0.5 }}
          >
            Create Quote
          </Button>
        </Stack>
      </Box>

      {/* ── Error banner ── */}
      {isError && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: '6px',
            border: '1px solid',
            borderColor: 'error.light',
            backgroundColor: 'rgba(220,38,38,0.06)',
          }}
        >
          <AlertIcon color="error" />
          <Box sx={{ flex: 1 }}>
            <MUITypography variant="alertTitle" sx={{ color: 'error.main' }}>
              Failed to load quotes
            </MUITypography>
            <MUITypography variant="finePrint">{getErrorMessage(error)}</MUITypography>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <CrmTable<QuoteRow>
        columns={CRM_COLUMNS}
        rows={tableRows}
        getRowId={(row) => row.id}
        loading={isLoading}
        refetching={isFetching && !isLoading}
        initialSearch={urlState.state.search}
        onSearchChange={urlState.setSearch}
        searchPlaceholder="Search quote, name, phone"
        filterColumns={filterColumns}
        filterModel={filters}
        onFilterChange={urlState.setFilters}
        sortModel={urlState.state.sortModel}
        onSortChange={urlState.setSortModel}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={quoteData?.meta.total ?? 0}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onRowClick={(row) => void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: row.id }))}
        itemLabel="quotes"
        renderEmptyState={renderEmptyState}
      />
    </Box>
  );
}
