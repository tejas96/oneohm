import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

import type { ColumnConfig, FilterState, TableSortModel } from '../advanced-table/types';

/**
 * The column-level filter contract is deliberately NOT redefined here.
 *
 * `CrmTable` renders the very same `TableFilters` popover that `AdvancedTable`
 * uses, driven by the same `ColumnConfig` objects. That means every filter type
 * (text with per-column debounce, select, date, range, `renderFilter` escape
 * hatch), the active-filter chip row, and the reset semantics behave identically
 * to every other list in the app — and a fix to filtering lands in both tables
 * at once instead of drifting.
 */
export type { ColumnConfig, FilterState, TableSortModel };

export type CrmDensity = 'comfortable' | 'compact';

/** Semantic tones available to quick-filter chips and status pills. */
export type CrmTone = 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger';

// ============================================================================
// Columns
// ============================================================================

export interface CrmColumn<TRow> {
  /**
   * Stable identity for the column: used as the React key, as the
   * column-visibility toggle key, and — when `sortField` is omitted but
   * `sortable` is set — as the sort field.
   */
  field: string;

  /** Rendered in the sticky overline header row. Empty string for the actions column. */
  header: string;

  /**
   * A single `grid-template-columns` track, always a `crm['col-*']` theme token.
   * `CrmTable` joins the tracks of the currently visible columns to build the
   * template, so hiding a column re-flows the grid without any hardcoded width.
   */
  track: string;

  /** Show a sort affordance in the header. */
  sortable?: boolean;

  /**
   * Field name emitted in the sort model. Defaults to `field`. Set this when the
   * display column and the API sort key differ (e.g. `name` → `firstName`).
   */
  sortField?: string;

  /** Right-align the header and cell content (numeric columns, actions). */
  align?: 'left' | 'right';

  /**
   * Exclude from the column-visibility menu. Use for structural columns the
   * user must not be able to hide, such as row actions.
   */
  hideable?: boolean;

  /** Start hidden; the user can reveal it from the column-visibility menu. */
  defaultHidden?: boolean;

  /**
   * Swallow clicks originating inside this cell so they neither expand the row
   * nor fire `onRowClick`. Required for any cell containing its own
   * interactive controls (links, menus, checkboxes).
   */
  stopPropagation?: boolean;

  /** Extra styles merged onto the cell wrapper. */
  cellSx?: SxProps<Theme>;

  renderCell: (row: TRow) => ReactNode;
}

// ============================================================================
// Quick filters
// ============================================================================

/**
 * A chip in the toolbar's quick-filter row.
 *
 * Quick filters are a shortcut into the *same* filter model the popover writes
 * to — never a parallel piece of state. The customer list points its status
 * chips at the `status` filter field, so selecting "Active" and selecting
 * Status → Active in the popover are the same action and stay visibly in sync.
 */
export interface CrmQuickFilter {
  /** Value written to the filter field; the all-clear chip uses `''`. */
  key: string;
  label: string;
  /** Appended after a middot when defined. */
  count?: number;
  tone?: CrmTone;
  /** Show a leading tone-coloured dot. */
  dot?: boolean;
}

// ============================================================================
// Bulk actions
// ============================================================================

export interface CrmBulkAction<TRow> {
  label: string;
  /** `primary` renders a filled button; `secondary` (default) an outlined one. */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Shown on hover when `disabled` — explain why, don't just grey it out. */
  disabledTooltip?: string;
  onClick: (selectedRows: TRow[]) => void;
}

// ============================================================================
// Table props
// ============================================================================

export interface CrmTableProps<TRow> {
  columns: CrmColumn<TRow>[];
  rows: TRow[];

  /** Stable per-row identity, used for selection, expansion and React keys. */
  getRowId: (row: TRow) => string;

  /** Initial load with no data yet — renders skeleton rows. */
  loading?: boolean;
  /**
   * Background refetch with rows already on screen. Shows a hairline progress
   * bar instead of replacing the grid, so filtering never flashes empty.
   */
  refetching?: boolean;

  // ── Appearance ───────────────────────────────────────────────────────────
  /** Row height: `comfortable` (64px, default) or `compact` (50px). */
  density?: CrmDensity;
  /** Alternate row surfaces. Default true. */
  zebra?: boolean;
  /** Brand gradient rail on the expanded row. Default true. */
  accentSpine?: boolean;

  // ── Search ───────────────────────────────────────────────────────────────
  /**
   * Seed for the search input. The table owns the input value and debounces it
   * before calling `onSearchChange`, so passing the committed (URL) search back
   * in does not fight the user's typing.
   */
  initialSearch?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;

  // ── Quick filters ────────────────────────────────────────────────────────
  quickFilters?: CrmQuickFilter[];
  /** Currently selected `CrmQuickFilter.key`. */
  activeQuickFilter?: string;
  onQuickFilterChange?: (key: string) => void;

  // ── Column filters (shared AdvancedTable contract) ───────────────────────
  filterColumns?: ColumnConfig<TRow>[];
  filterModel?: FilterState;
  onFilterChange?: (filters: FilterState) => void;

  // ── Sort ─────────────────────────────────────────────────────────────────
  sortModel?: TableSortModel | null;
  onSortChange?: (model: TableSortModel | null) => void;

  // ── Pagination ───────────────────────────────────────────────────────────
  page?: number;
  pageSize?: number;
  totalRowCount?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // ── Selection ────────────────────────────────────────────────────────────
  enableRowSelection?: boolean;
  bulkActions?: CrmBulkAction<TRow>[];
  onRowSelectionChange?: (selectedRows: TRow[]) => void;
  /** Pluralised label for the floating selection bar. */
  selectionLabel?: (count: number) => string;

  // ── Expansion ────────────────────────────────────────────────────────────
  renderExpandedRow?: (row: TRow) => ReactNode;
  /**
   * Row ids expanded on first render. Applied once on mount — later changes are
   * ignored so it can't fight the user's own expand/collapse.
   */
  defaultExpandedRowIds?: string[];

  // ── Row interaction ──────────────────────────────────────────────────────
  /**
   * Called on row click. When `renderExpandedRow` is set the click toggles
   * expansion instead, matching the design's "expand a row to work the
   * portfolio" model — put navigation on an explicit link inside a cell.
   */
  onRowClick?: (row: TRow) => void;

  // ── Empty state ──────────────────────────────────────────────────────────
  /** Receives whether search or any filter is currently narrowing the list. */
  renderEmptyState?: (hasActiveFilters: boolean) => ReactNode;
  emptyMessage?: string;

  /** Pluralised noun for the pagination summary ("customers"). */
  itemLabel?: string;

  /** Extra controls appended to the right of the toolbar. */
  toolbarActions?: ReactNode;

  sx?: SxProps<Theme>;
}
