'use client';

// external
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
import type { AdvancedTableProps, FilterState, TableFilterModel, TableSortModel } from './types';
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
import { formatDate } from '@/lib/utils';

// ============================================================================
// Main AdvancedTable component
// ============================================================================

export function AdvancedTable<TRow extends Record<string, unknown>>({
  columns,
  rows,
  rowIdField = 'id',
  loading = false,

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

  // Row interaction
  onRowClick,

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
  toolbarActions,
  sx,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
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

  // Clear row selection when the rows dataset reference changes (no ghost IDs across pages)
  const prevRowsRef = useRef(rows);
  useEffect(() => {
    if (rows !== prevRowsRef.current) {
      prevRowsRef.current = rows;
      setSelectedRowIds(new Set());
    }
  }, [rows]);

  // Initialise searchQuery from URL once on mount (enableUrlSync path only)
  useEffect(() => {
    if (enableUrlSync) setSearchQuery(urlStateRef.current.state.search);
    // Runs once on mount to seed the search input from URL.
    // Subsequent URL back/fwd changes are handled by the popstate handler inside
    // useTableUrlState which updates urlState.state.search, and the effect below
    // keeps searchQuery in sync with it.
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
    // Intentionally depends only on enableUrlSync + controlledPageSize — runs once on mount.
    // Callback refs ensure the most current versions are called without re-registering.
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

  // Flush debounced search to URL (URL-sync mode only)
  useEffect(() => {
    if (enableUrlSync) urlStateRef.current.setSearch(debouncedSearch);
  }, [debouncedSearch, enableUrlSync]);

  // Reset page on search change (non-URL mode)
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const isFirstSearchRender = useRef(true);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    if (enableUrlSync) return; // URL mode handles reset inside setSearch
    if (onPageChangeRef.current) onPageChangeRef.current(0);
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

  // Stable ref so TableFilters memo is not busted on every render
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

  // ── Pagination handlers ─────────────────────────────────────────────────────

  // Ref used by the page-clamp effect (declared before handlePageChange to avoid forward-ref)
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

  // ── Derived display helpers (memoised to avoid inline .every/.some on render) ──

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100%', ...sx }}>
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
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
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
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
              }}
              sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          )}

          <Box sx={{ flex: 1 }} />

          {enableFilters && hasFilterableColumns && (
            <TableFiltersToggle
              filters={filters}
              open={filterPanelOpen}
              onToggle={() => setFilterPanelOpen((v) => !v)}
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

        {/* ── Filter panel + active chips ── */}
        {enableFilters && (
          <TableFilters
            columns={columns}
            filters={filters}
            open={filterPanelOpen}
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
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
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
                <EmptyState message={emptyMessage} colCount={totalColCount} />
              ) : (
                displayRows.map((row) => {
                  const rowId = getRowId(row);
                  const isExpanded = expandedRows.has(rowId);
                  const isSelected = selectedRowIds.has(rowId);

                  return (
                    <Fragment key={rowId}>
                      <TableRow
                        hover={!!onRowClick}
                        selected={isSelected}
                        onClick={() => onRowClick?.(row)}
                        sx={{
                          cursor: onRowClick ? 'pointer' : 'default',
                          '&.Mui-selected': {
                            backgroundColor: 'primary.50',
                            '&:hover': { backgroundColor: 'primary.100' },
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
                                width: col.width,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: col.width ?? 240,
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
                          <TableCell
                            colSpan={totalColCount}
                            sx={{ p: 0, borderBottom: '1px solid', borderColor: 'divider' }}
                          >
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box
                                sx={{
                                  px: 3,
                                  py: 2,
                                  backgroundColor: 'grey.50',
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
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
// All kept in this file intentionally — they are tightly coupled to the table's
// internal types and are not consumed anywhere else. If any grows beyond ~60 lines
// it should be extracted to its own file under advanced-table/.
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
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          startIcon={<ViewColumnIcon />}
          sx={{ fontWeight: 500 }}
        >
          Columns
        </Button>
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
        sx={{ backgroundColor: 'primary.dark', color: 'white', fontWeight: 600 }}
      />
      <Stack direction="row" spacing={1}>
        {bulkActions.map((action, idx) => (
          <Button
            key={idx}
            size="small"
            variant="contained"
            color={action.color ?? 'primary'}
            startIcon={action.icon}
            onClick={() => action.onClick(selectedRows)}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
              fontWeight: 500,
            }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
      <Box sx={{ flex: 1 }} />
      <Button
        size="small"
        variant="text"
        onClick={onClear}
        sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: 'white' } }}
      >
        Clear selection
      </Button>
    </Box>
  );
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

function EmptyState({ message, colCount }: { message: string; colCount: number }): JSX.Element {
  return (
    <TableRow>
      <TableCell colSpan={colCount} sx={{ py: 6, textAlign: 'center', border: 'none' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <InboxOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}
