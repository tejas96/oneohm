import type { ReactNode } from 'react';

// ============================================================================
// Column Configuration
// ============================================================================

export type ColumnType = 'string' | 'number' | 'date' | 'boolean';
export type FilterType = 'text' | 'select' | 'date' | 'range';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  [field: string]: unknown;
}

export interface CellParams<TRow = Record<string, unknown>> {
  row: TRow;
  value: unknown;
  field: string;
}

export interface ColumnConfig<TRow = Record<string, unknown>> {
  field: string;
  headerName: string;
  type?: ColumnType;

  /** Enable sort on this column */
  sortable?: boolean;
  /** Include this column in column-level filter UI */
  filterable?: boolean;
  /** Include this column in global search */
  searchable?: boolean;

  width?: number;
  /** Flex grow factor — mutually exclusive with width */
  flex?: number;

  /** Custom cell renderer */
  renderCell?: (params: CellParams<TRow>) => ReactNode;
  /** Action buttons rendered inside the cell */
  actions?: (row: TRow) => ReactNode;

  /** Type of filter UI shown in the filter panel */
  filterType?: FilterType;
  /** Options for 'select' filterType */
  filterOptions?: Array<{ label: string; value: string | number }>;

  /** Format raw value to display string */
  valueFormatter?: (value: unknown) => string;

  /** Hide from column visibility toggle list */
  hideable?: boolean;

  /** Default hidden */
  defaultHidden?: boolean;
}

// ============================================================================
// Sorting & Filtering models (passed to callbacks)
// ============================================================================

export interface TableSortModel {
  field: string;
  direction: SortDirection;
}

export type TableFilterModel = FilterState;

// ============================================================================
// Pagination
// ============================================================================

export type PaginationMode = 'server' | 'client';

// ============================================================================
// Row Selection
// ============================================================================

export interface BulkAction<TRow = Record<string, unknown>> {
  label: string;
  icon?: ReactNode;
  onClick: (selectedRows: TRow[]) => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
}

// ============================================================================
// Main Table Props
// ============================================================================

export interface AdvancedTableProps<TRow = Record<string, unknown>> {
  columns: ColumnConfig<TRow>[];
  rows: TRow[];

  /** Unique row identifier field — defaults to 'id' */
  rowIdField?: string;

  loading?: boolean;

  // ── Pagination ─────────────────────────────────────────────────────────────
  page?: number;
  pageSize?: number;
  totalRowCount?: number;
  paginationMode?: PaginationMode;
  pageSizeOptions?: number[];

  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // ── Sort ───────────────────────────────────────────────────────────────────
  /** Controlled sort model */
  sortModel?: TableSortModel | null;
  onSortChange?: (sortModel: TableSortModel | null) => void;

  // ── Filters ────────────────────────────────────────────────────────────────
  filterModel?: TableFilterModel;
  onFilterChange?: (filters: TableFilterModel) => void;

  // ── Row interaction ────────────────────────────────────────────────────────
  onRowClick?: (row: TRow) => void;

  // ── Expandable rows ────────────────────────────────────────────────────────
  renderExpandedRow?: (row: TRow) => ReactNode;

  // ── Row selection ──────────────────────────────────────────────────────────
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedRows: TRow[]) => void;
  bulkActions?: BulkAction<TRow>[];

  // ── Feature flags ──────────────────────────────────────────────────────────
  enableSearch?: boolean;
  enableFilters?: boolean;
  enablePagination?: boolean;
  enableColumnVisibility?: boolean;
  enableExportCsv?: boolean;

  // ── UI ─────────────────────────────────────────────────────────────────────
  searchPlaceholder?: string;
  emptyMessage?: string;
  itemLabel?: string;

  /** Extra actions rendered in the toolbar (right side) */
  toolbarActions?: ReactNode;

  /** Applied to the outermost Box */
  sx?: object;

  // ── URL sync ───────────────────────────────────────────────────────────────
  /**
   * When true, page / pageSize / sort / filters / search are automatically
   * synced to/from URL search params (bookmarkable & shareable).
   * Compatible with both client-side and server-side pagination modes.
   */
  enableUrlSync?: boolean;
  /** Prefix applied to every URL param key — required when multiple tables share a page */
  urlPrefix?: string;
}
