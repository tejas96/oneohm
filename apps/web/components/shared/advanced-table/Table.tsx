'use client';

// external
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  type ChangeEvent,
  Fragment,
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { TableFilters, TableFiltersToggle } from './TableFilters';
import { AdvancedTableHeader } from './TableHeader';
import { AdvancedTablePagination } from './TablePagination';
import type {
  AdvancedTableProps,
  BulkAction,
  FilterState,
  TableFilterModel,
  TableSortModel,
} from './types';
import {
  exportToCsv,
  filterRows,
  getNestedValue,
  globalSearchRows,
  paginateRows,
  sortRows,
  toSortableString,
} from './utils';

import { useDebounce, useTableUrlState } from '@/lib/hooks';
import { radius, shadow } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

// ============================================================================
// Main AdvancedTable component
// ============================================================================

export function AdvancedTable<TRow extends Record<string, unknown>>({
  columns,
  rows,
  rowIdField = 'id',
  loading = false,
  refetching = false,

  // Pagination
  page: controlledPage,
  pageSize: controlledPageSize,
  totalRowCount,
  paginationMode = 'server',
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,

  // Sort
  sortModel: controlledSortModel,
  onSortChange,

  // Filters
  filterModel: controlledFilterModel,
  onFilterChange,

  // Search
  onSearchChange,
  initialSearch = '',

  // Row interaction
  onRowClick,
  onRowDoubleClick,

  // Expandable rows
  renderExpandedRow,

  // Row selection
  enableRowSelection = false,
  onRowSelectionChange,
  bulkActions,

  // Features
  enableSearch = true,
  enableFilters = true,
  enablePagination = true,
  enableColumnVisibility = true,
  enableExportCsv = false,
  enableUrlSync = false,
  urlPrefix = '',

  // UI
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  itemLabel = 'rows',
  renderEmptyState,
  toolbarActions,
  sx,
  maxHeight = 'calc(100vh - 300px)',
}: AdvancedTableProps<TRow>): JSX.Element {
  // ── URL state ──────────────────────────────────────────────────────────────
  // Always called (rule of hooks). When enableUrlSync=false the hook is mounted
  // but its state is never read — minimal overhead.
  const urlState = useTableUrlState({
    prefix: urlPrefix,
    defaultPageSize: controlledPageSize ?? 10,
    pushForPageChanges: true,
  });

  // Single stable ref for all url-state setters — eliminates 5 individual refs
  const urlStateRef = useRef(urlState);
  urlStateRef.current = urlState;

  // ── Internal state (uncontrolled fallbacks) ─────────────────────────────────

  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(controlledPageSize ?? 10);
  const [internalSortModel, setInternalSortModel] = useState<TableSortModel | null>(null);
  const [internalFilters, setInternalFilters] = useState<FilterState>({});
  // Seed from `initialSearch` so deep-linked search params (e.g. when
  // the parent reads `?search=foo` from URL via FDAL) appear in the
  // input without an extra effect cycle.
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(columns.filter((c) => !c.defaultHidden).map((c) => c.field)),
  );

  // Sync internalPageSize when the controlled prop changes after mount
  useEffect(() => {
    if (controlledPageSize !== undefined) setInternalPageSize(controlledPageSize);
  }, [controlledPageSize]);

  // Rebuild visibleColumns when the columns definition identity changes
  const prevColumnFieldsRef = useRef<string>('');
  useEffect(() => {
    const key = columns.map((c) => c.field).join(',');
    if (key !== prevColumnFieldsRef.current) {
      prevColumnFieldsRef.current = key;
      setVisibleColumns(new Set(columns.filter((c) => !c.defaultHidden).map((c) => c.field)));
    }
  }, [columns]);

  // Initialise searchQuery from URL once on mount (enableUrlSync path only)
  useEffect(() => {
    if (enableUrlSync) setSearchQuery(urlStateRef.current.state.search);
    // Runs once on mount to seed the search input from URL.
  }, []);

  // Keep searchQuery in sync with URL state on browser back/forward
  useEffect(() => {
    if (enableUrlSync) setSearchQuery(urlState.state.search);
  }, [enableUrlSync, urlState.state.search]);

  // On mount: notify server-side consumers of any URL-restored state so they
  // can issue the correct initial fetch. Runs exactly once.
  const didMountNotifyRef = useRef(false);
  const onPageChangeStableRef = useRef(onPageChange);
  onPageChangeStableRef.current = onPageChange;
  const onPageSizeChangeStableRef = useRef(onPageSizeChange);
  onPageSizeChangeStableRef.current = onPageSizeChange;
  const onSortChangeStableRef = useRef(onSortChange);
  onSortChangeStableRef.current = onSortChange;
  const onFilterChangeStableRef = useRef(onFilterChange);
  onFilterChangeStableRef.current = onFilterChange;

  useEffect(() => {
    if (!enableUrlSync || didMountNotifyRef.current) return;
    didMountNotifyRef.current = true;

    const { page: p, pageSize: ps, sortModel: sm, filters: f } = urlStateRef.current.state;
    if (p !== 0) onPageChangeStableRef.current?.(p);
    if (ps !== (controlledPageSize ?? 10)) onPageSizeChangeStableRef.current?.(ps);
    if (sm) onSortChangeStableRef.current?.(sm as TableSortModel);
    if (Object.keys(f).length > 0) onFilterChangeStableRef.current?.(f);
  }, [enableUrlSync, controlledPageSize]);

  // ── Resolve controlled vs. uncontrolled vs. URL-synced ──────────────────────

  const page = enableUrlSync ? urlState.state.page : (controlledPage ?? internalPage);
  const pageSize = enableUrlSync
    ? urlState.state.pageSize
    : (controlledPageSize ?? internalPageSize);

  const sortModel: TableSortModel | null = enableUrlSync
    ? (urlState.state.sortModel as TableSortModel | null)
    : controlledSortModel !== undefined
      ? controlledSortModel
      : internalSortModel;

  const filters: FilterState = enableUrlSync
    ? urlState.state.filters
    : (controlledFilterModel ?? internalFilters);

  // ── Debounced search ────────────────────────────────────────────────────────

  const debouncedSearch = useDebounce(searchQuery, 300);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  }, []);

  // Flush debounced search to URL (URL-sync mode)
  useEffect(() => {
    if (enableUrlSync) urlStateRef.current.setSearch(debouncedSearch);
  }, [debouncedSearch, enableUrlSync]);

  // Notify external server-side consumers of search changes (non-URL-sync mode)
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  // Declared here (before first use in the search effect below) so all refs are
  // in one place and declaration order matches usage order.
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  // Track the last value we notified the parent of so StrictMode's
  // double-invocation of effects (and the initial mount with an empty
  // searchQuery) don't clobber a URL-restored search on the parent.
  // We seed with the current debouncedSearch so the very first effect
  // run is a no-op unless the user typed during render (which never
  // happens in practice).
  const lastNotifiedSearchRef = useRef<string>(debouncedSearch);

  useEffect(() => {
    if (enableUrlSync) return; // URL mode handles search reset internally
    if (lastNotifiedSearchRef.current === debouncedSearch) return;
    lastNotifiedSearchRef.current = debouncedSearch;
    onSearchChangeRef.current?.(debouncedSearch);
    // Reset page on real search change.
    const pageChangeCallback = onPageChangeRef.current;
    if (pageChangeCallback) pageChangeCallback(0);
    else setInternalPage(0);
  }, [debouncedSearch, enableUrlSync]);

  // ── Client-side data pipeline ───────────────────────────────────────────────

  const processedRows = useMemo(() => {
    if (paginationMode === 'server') return rows;
    let result = rows;
    if (debouncedSearch) result = globalSearchRows(result, debouncedSearch, columns);
    result = filterRows(result, filters, columns);
    result = sortRows(result, sortModel, columns);
    return result;
  }, [rows, paginationMode, debouncedSearch, filters, sortModel, columns]);

  const displayRows = useMemo(() => {
    if (paginationMode === 'server' || !enablePagination) return processedRows;
    return paginateRows(processedRows, page, pageSize);
  }, [processedRows, paginationMode, enablePagination, page, pageSize]);

  const effectiveTotalCount = useMemo(
    () => (paginationMode === 'server' ? (totalRowCount ?? rows.length) : processedRows.length),
    [paginationMode, totalRowCount, rows.length, processedRows.length],
  );

  // ── Sort handler ────────────────────────────────────────────────────────────

  const handleSortChange = useCallback(
    (model: TableSortModel | null): void => {
      if (enableUrlSync) {
        urlStateRef.current.setSortModel(model);
        return;
      }
      if (onSortChange) onSortChange(model);
      else setInternalSortModel(model);
      if (onPageChange) onPageChange(0);
      else setInternalPage(0);
    },
    [enableUrlSync, onSortChange, onPageChange],
  );

  // ── Filter handler ──────────────────────────────────────────────────────────

  const handleFilterChangeRef = useRef<(newFilters: TableFilterModel) => void>(() => undefined);

  const handleFilterChange = useCallback(
    (newFilters: TableFilterModel): void => {
      if (enableUrlSync) {
        urlStateRef.current.setFilters(newFilters);
        return;
      }
      if (onFilterChange) onFilterChange(newFilters);
      else setInternalFilters(newFilters);
      if (onPageChange) onPageChange(0);
      else setInternalPage(0);
    },
    [enableUrlSync, onFilterChange, onPageChange],
  );
  handleFilterChangeRef.current = handleFilterChange;

  // Stable wrapper passed to TableFilters so memo() is effective
  const stableHandleFilterChange = useCallback(
    (newFilters: TableFilterModel): void => handleFilterChangeRef.current(newFilters),
    [],
  );

  const stableCloseFilters = useCallback((): void => {
    setFilterAnchorEl(null);
  }, []);

  const stableToggleFilters = useCallback((e: React.MouseEvent<HTMLButtonElement>): void => {
    setFilterAnchorEl((prev) => (prev ? null : e.currentTarget));
  }, []);

  // ── Pagination handlers ─────────────────────────────────────────────────────

  const handlePageChangeRef = useRef<(page: number) => void>(() => undefined);

  const handlePageChange = useCallback(
    (newPage: number): void => {
      if (enableUrlSync) {
        urlStateRef.current.setPage(newPage);
        return;
      }
      if (onPageChange) onPageChange(newPage);
      else setInternalPage(newPage);
    },
    [enableUrlSync, onPageChange],
  );
  handlePageChangeRef.current = handlePageChange;

  // Auto-reset to page 0 when client-side filtering reduces result set below current page
  useEffect(() => {
    if (paginationMode !== 'client' || !enablePagination) return;
    const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
    if (page > 0 && page >= totalPages) handlePageChangeRef.current(0);
  }, [processedRows.length, pageSize, page, paginationMode, enablePagination]);

  const handlePageSizeChange = useCallback(
    (newSize: number): void => {
      if (enableUrlSync) {
        urlStateRef.current.setPageSize(newSize);
        return;
      }
      if (onPageSizeChange) onPageSizeChange(newSize);
      else setInternalPageSize(newSize);
      if (onPageChange) onPageChange(0);
      else setInternalPage(0);
    },
    [enableUrlSync, onPageChange, onPageSizeChange],
  );

  // ── Row expand ──────────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string): void => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Row ID helper ───────────────────────────────────────────────────────────

  const getRowId = useCallback(
    (row: TRow): string => {
      const id = getNestedValue(row, rowIdField);
      return id != null ? toSortableString(id) : JSON.stringify(row);
    },
    [rowIdField],
  );

  // Keep selection in sync with currently available rows without hard-resetting.
  // This avoids update-depth loops when parents provide fresh-but-equivalent arrays.
  useEffect(() => {
    if (selectedRowIds.size === 0) return;
    const availableIds = new Set(rows.map(getRowId));
    const next = new Set(Array.from(selectedRowIds).filter((id) => availableIds.has(id)));
    const changed = next.size !== selectedRowIds.size;

    if (changed) setSelectedRowIds(next);
  }, [rows, getRowId, selectedRowIds]);

  // ── Row selection ───────────────────────────────────────────────────────────

  const selectedRows = useMemo(
    () => displayRows.filter((r) => selectedRowIds.has(getRowId(r))),
    [displayRows, selectedRowIds, getRowId],
  );

  useEffect(() => {
    onRowSelectionChange?.(selectedRows);
  }, [selectedRows, onRowSelectionChange]);

  const handleSelectAll = useCallback(
    (checked: boolean): void => {
      setSelectedRowIds(checked ? new Set(displayRows.map(getRowId)) : new Set());
    },
    [displayRows, getRowId],
  );

  const handleSelectRow = useCallback(
    (row: TRow, checked: boolean): void => {
      const id = getRowId(row);
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [getRowId],
  );

  // ── Column visibility ───────────────────────────────────────────────────────

  const toggleColumnVisibility = useCallback((field: string): void => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExport = useCallback((): void => {
    const exportRows = paginationMode === 'client' ? processedRows : rows;
    exportToCsv(exportRows, columns);
  }, [paginationMode, processedRows, rows, columns]);

  // ── Derived display helpers ─────────────────────────────────────────────────

  const visibleColList = useMemo(
    () => columns.filter((c) => visibleColumns.has(c.field)),
    [columns, visibleColumns],
  );

  const totalColCount = useMemo(
    () => visibleColList.length + (enableRowSelection ? 1 : 0) + (renderExpandedRow ? 1 : 0),
    [visibleColList.length, enableRowSelection, renderExpandedRow],
  );

  const { allSelected, someSelected } = useMemo(() => {
    if (displayRows.length === 0) return { allSelected: false, someSelected: false };
    const all = displayRows.every((r) => selectedRowIds.has(getRowId(r)));
    const some = !all && displayRows.some((r) => selectedRowIds.has(getRowId(r)));
    return { allSelected: all, someSelected: some };
  }, [displayRows, selectedRowIds, getRowId]);

  const hasFilterableColumns = useMemo(() => columns.some((c) => c.filterable), [columns]);

  // Whether any filter or search is currently active (used by renderEmptyState)
  const hasActiveFilters = useMemo(
    () => debouncedSearch.length > 0 || Object.values(filters).some((v) => v !== '' && v != null),
    [debouncedSearch, filters],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100%', ...sx }}>
      <Paper
        elevation={0}
        sx={{
          // DS: the table surface floats on the canvas via elevation, with no
          // border. 12px is the functional-density card radius.
          boxShadow: shadow.e2,
          borderRadius: radius['rf-lg'],
          // Do NOT set overflow:hidden here — it would clip the sticky thead.
          // Corner clipping is handled by the TableContainer below.
        }}
      >
        {/* ── Toolbar ── */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            // No rule under the toolbar — the header row's own surface and
            // the zebra rows below carry the separation.
            backgroundColor: 'background.paper',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
          }}
        >
          {enableSearch && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      sx={{ p: 0.25 }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              // Radius comes from the theme (DS functional input, 10px) —
              // overriding it here made the table's search field the one
              // odd-shaped input in the app.
              sx={{ width: 240 }}
            />
          )}

          <Box sx={{ flex: 1 }} />

          {enableFilters && hasFilterableColumns && (
            <TableFiltersToggle
              filters={filters}
              open={Boolean(filterAnchorEl)}
              onToggle={stableToggleFilters}
            />
          )}

          {enableColumnVisibility && (
            <ColumnVisibilityMenu
              columns={columns}
              visibleColumns={visibleColumns}
              onToggle={toggleColumnVisibility}
            />
          )}

          {enableExportCsv && (
            <Tooltip title="Export to CSV">
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={handleExport}
                startIcon={<DownloadIcon />}
                sx={{ fontWeight: 500 }}
              >
                Export
              </Button>
            </Tooltip>
          )}

          {toolbarActions}
        </Box>

        {/* ── Refetch progress bar — subtle indicator while background fetch runs ── */}
        <LinearProgress
          sx={{
            height: 2,
            // visible only while refetching; hidden otherwise without layout shift
            opacity: refetching ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}
        />

        {/* ── Filter panel + active chips ── */}
        {enableFilters && (
          <TableFilters
            columns={columns}
            filters={filters}
            anchorEl={filterAnchorEl}
            onClose={stableCloseFilters}
            onFilterChange={stableHandleFilterChange}
          />
        )}

        {/* ── Bulk actions bar ── */}
        {enableRowSelection && selectedRowIds.size > 0 && bulkActions && bulkActions.length > 0 && (
          <BulkActionsBar
            selectedRows={selectedRows}
            bulkActions={bulkActions}
            onClear={() => setSelectedRowIds(new Set())}
          />
        )}

        {/* ── Table ── */}
        {/* TODO: add mobile-responsive card view for small viewports */}
        <TableContainer sx={{ maxHeight, overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <AdvancedTableHeader
              columns={columns}
              visibleColumns={visibleColumns}
              sortModel={sortModel}
              onSortChange={handleSortChange}
              enableRowSelection={enableRowSelection}
              allSelected={allSelected}
              someSelected={someSelected}
              onSelectAll={handleSelectAll}
              hasExpandableRows={!!renderExpandedRow}
            />

            <TableBody>
              {loading ? (
                <SkeletonRows colCount={totalColCount} rowCount={pageSize} />
              ) : displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalColCount} sx={{ border: 'none' }}>
                    {renderEmptyState ? (
                      renderEmptyState(hasActiveFilters)
                    ) : (
                      <DefaultEmptyState message={emptyMessage} />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row) => {
                  const rowId = getRowId(row);
                  const isExpanded = expandedRows.has(rowId);
                  const isSelected = selectedRowIds.has(rowId);

                  return (
                    <Fragment key={rowId}>
                      <TableRow
                        hover={!!onRowClick || !!onRowDoubleClick}
                        selected={isSelected}
                        onClick={(e) => {
                          // Ignore clicks that originate from portal-rendered elements
                          // (MUI Menu, MUI Dialog, Radix, Drawer, etc.) — their DOM lives
                          // in document.body, not inside this row, so contains() is false.
                          if (!e.currentTarget.contains(e.target as Node)) return;
                          onRowClick?.(row);
                        }}
                        onDoubleClick={(e) => {
                          if (!e.currentTarget.contains(e.target as Node)) return;
                          onRowDoubleClick?.(row);
                        }}
                        sx={{
                          cursor: onRowClick || onRowDoubleClick ? 'pointer' : 'default',
                          '&.Mui-selected': {
                            backgroundColor: 'action.selected',
                            '&:hover': { backgroundColor: 'action.focus' },
                          },
                        }}
                      >
                        {renderExpandedRow && (
                          <TableCell
                            padding="none"
                            sx={{ width: 40, pl: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(rowId);
                            }}
                          >
                            <IconButton size="small" tabIndex={-1} aria-label="Expand row">
                              {isExpanded ? (
                                <KeyboardArrowDownIcon fontSize="small" />
                              ) : (
                                <KeyboardArrowRightIcon fontSize="small" />
                              )}
                            </IconButton>
                          </TableCell>
                        )}

                        {enableRowSelection && (
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(row, e.target.checked)}
                              sx={{ p: 0.5 }}
                            />
                          </TableCell>
                        )}

                        {visibleColList.map((col) => {
                          const rawValue = getNestedValue(row, col.field);
                          const displayValue = col.valueFormatter
                            ? col.valueFormatter(rawValue)
                            : col.type === 'boolean'
                              ? String(rawValue)
                              : col.type === 'date' && rawValue
                                ? formatDate(rawValue as string)
                                : ((rawValue as string | number | null | undefined) ?? '—');

                          return (
                            <TableCell
                              key={col.field}
                              sx={{
                                // width takes precedence; flex expressed as a percentage width
                                width: col.width ?? (col.flex ? `${col.flex * 10}%` : undefined),
                                minWidth: col.width,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: col.width ?? (col.flex ? undefined : 240),
                                px: 2,
                                // Per-column cell style overrides (e.g. allow wrapping)
                                ...col.cellSx,
                              }}
                            >
                              {col.renderCell
                                ? col.renderCell({ row, value: rawValue, field: col.field })
                                : col.actions
                                  ? col.actions(row)
                                  : displayValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {renderExpandedRow && isExpanded && (
                        <TableRow>
                          <TableCell colSpan={totalColCount} sx={{ p: 0 }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box
                                sx={{
                                  px: 3,
                                  py: 2,
                                  // Sunken well marks the expanded panel —
                                  // no rule needed above it.
                                  backgroundColor: 'var(--ds-canvas-sunken)',
                                }}
                              >
                                {renderExpandedRow(row)}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {enablePagination && (
          <AdvancedTablePagination
            page={page}
            pageSize={pageSize}
            totalRowCount={effectiveTotalCount}
            pageSizeOptions={pageSizeOptions}
            itemLabel={itemLabel}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </Paper>
    </Box>
  );
}

// ============================================================================
// Private sub-components
// Kept co-located — they are tightly coupled to the table's internal types and
// are not consumed elsewhere. Extract to own file if any grows beyond ~60 lines.
// ============================================================================

interface ColumnVisibilityMenuProps<TRow> {
  columns: AdvancedTableProps<TRow>['columns'];
  visibleColumns: Set<string>;
  onToggle: (field: string) => void;
}

function ColumnVisibilityMenu<TRow>({
  columns,
  visibleColumns,
  onToggle,
}: ColumnVisibilityMenuProps<TRow>): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const hideableColumns = columns.filter((c) => c.hideable !== false);

  return (
    <>
      <Tooltip title="Toggle columns">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          className="rounded-lg p-2.5 bg-background shadow-e1 hover:shadow-e2"
        >
          <ViewColumnIcon className="size-4" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {hideableColumns.map((col) => (
          <MenuItem key={col.field} dense onClick={() => onToggle(col.field)} sx={{ px: 1.5 }}>
            <FormControlLabel
              control={
                <Checkbox size="small" checked={visibleColumns.has(col.field)} sx={{ p: 0.5 }} />
              }
              label={<Typography variant="body2">{col.headerName}</Typography>}
              sx={{ m: 0, gap: 1 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

interface BulkActionsBarProps<TRow> {
  selectedRows: TRow[];
  bulkActions: NonNullable<AdvancedTableProps<TRow>['bulkActions']>;
  onClear: () => void;
}

function BulkActionsBar<TRow>({
  selectedRows,
  bulkActions,
  onClear,
}: BulkActionsBarProps<TRow>): JSX.Element {
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        backgroundColor: 'primary.main',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Chip
        label={`${selectedRows.length} selected`}
        size="small"
        sx={{ backgroundColor: 'primary.dark', color: 'primary.contrastText', fontWeight: 600 }}
      />
      <Stack direction="row" spacing={1}>
        {bulkActions.map((action) => (
          <BulkActionButton key={action.label} action={action} selectedRows={selectedRows} />
        ))}
      </Stack>
      <Box sx={{ flex: 1 }} />
      <Button
        size="small"
        variant="text"
        onClick={onClear}
        sx={{
          color: 'primary.contrastText',
          opacity: 0.8,
          '&:hover': { opacity: 1, backgroundColor: 'transparent' },
        }}
      >
        Clear selection
      </Button>
    </Box>
  );
}

/** Renders a single bulk-action button, optionally wrapped in a Tooltip when disabled */
function BulkActionButton<TRow>({
  action,
  selectedRows,
}: {
  action: BulkAction<TRow>;
  selectedRows: TRow[];
}): JSX.Element {
  const btn = (
    <span>
      {/* span is required so Tooltip works on disabled buttons */}
      <Button
        size="small"
        variant="contained"
        color={action.color ?? 'primary'}
        startIcon={action.icon}
        disabled={action.disabled}
        onClick={() => action.onClick(selectedRows)}
        sx={{
          backgroundColor: action.disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
          color: action.disabled ? 'primary.contrastText' : 'primary.contrastText',
          opacity: action.disabled ? 0.4 : 1,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
          '&.Mui-disabled': { color: 'primary.contrastText', opacity: 0.4 },
          fontWeight: 500,
          pointerEvents: action.disabled ? 'none' : 'auto',
        }}
      >
        {action.label}
      </Button>
    </span>
  );

  if (action.disabled && action.disabledTooltip) {
    return <Tooltip title={action.disabledTooltip}>{btn}</Tooltip>;
  }
  return btn;
}

function SkeletonRows({ colCount, rowCount }: { colCount: number; rowCount: number }): JSX.Element {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
          {Array.from({ length: colCount }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton variant="text" width="70%" height={16} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function DefaultEmptyState({ message }: { message: string }): JSX.Element {
  return (
    <Box
      sx={{
        py: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <InboxOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
