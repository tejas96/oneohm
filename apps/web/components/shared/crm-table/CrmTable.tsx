'use client';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Box, Checkbox, LinearProgress, Skeleton } from '@mui/material';
import {
  type ChangeEvent,
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CrmSelectionBar } from './CrmSelectionBar';
import { CrmTablePagination } from './CrmTablePagination';
import { CrmTableToolbar } from './CrmTableToolbar';
import type { CrmColumn, CrmTableProps, FilterState, TableSortModel } from './types';

import { TableFilters, toggleSortDirection } from '@/components/shared/advanced-table';
import { useDebounce } from '@/lib/hooks';
import { color, crm, gradient, radius, shadow } from '@/lib/theme/tokens';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Matches `AdvancedTable`, so search feels identical across the app. */
const SEARCH_DEBOUNCE_MS = 300;

// ============================================================================
// Header
// ============================================================================

interface CrmTableHeadProps<TRow> {
  columns: CrmColumn<TRow>[];
  gridTemplate: string;
  sortModel: TableSortModel | null;
  onSort: (column: CrmColumn<TRow>) => void;
  enableRowSelection: boolean;
  hasExpandableRows: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
}

/**
 * Sticky overline header.
 *
 * Sits on `canvas-sunken` with no rule beneath it: the DS separates a header
 * from its body by luminance and the overline's wide tracking, never a line.
 * It must stay opaque — rows scroll underneath it.
 */
function CrmTableHead<TRow>({
  columns,
  gridTemplate,
  sortModel,
  onSort,
  enableRowSelection,
  hasExpandableRows,
  allSelected,
  someSelected,
  onSelectAll,
}: CrmTableHeadProps<TRow>): JSX.Element {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 6,
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        alignItems: 'center',
        px: crm['row-gutter'],
        height: crm['head-height'],
        backgroundColor: color['canvas-sunken'],
        fontSize: crm['text-row-xs'],
        fontWeight: 700,
        letterSpacing: crm['text-overline-sm-track'],
        textTransform: 'uppercase',
        color: color['text-tertiary'],
      }}
    >
      {enableRowSelection ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            inputProps={{ 'aria-label': 'Select all rows on this page' }}
            sx={{ p: 0.5 }}
          />
        </Box>
      ) : null}

      {/* Spacer aligning the header with each row's caret column. */}
      {hasExpandableRows ? <Box /> : null}

      {columns.map((col) => {
        const sortField = col.sortField ?? col.field;
        const isSorted = sortModel?.field === sortField;

        if (!col.sortable) {
          return (
            <Box
              key={col.field}
              role="columnheader"
              sx={{ textAlign: col.align === 'right' ? 'right' : 'left', ...col.cellSx }}
            >
              {col.header}
            </Box>
          );
        }

        const SortIcon = isSorted
          ? sortModel.direction === 'asc'
            ? ArrowUpwardIcon
            : ArrowDownwardIcon
          : UnfoldMoreIcon;

        return (
          <Box
            key={col.field}
            component="button"
            type="button"
            role="columnheader"
            // Announces the active sort and its direction. Without it a screen
            // reader reports the button but not which column the grid is
            // currently ordered by.
            aria-sort={
              isSorted ? (sortModel.direction === 'asc' ? 'ascending' : 'descending') : 'none'
            }
            onClick={() => onSort(col)}
            aria-label={`Sort by ${col.header}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.625,
              justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              font: 'inherit',
              letterSpacing: 'inherit',
              textTransform: 'inherit',
              color: isSorted ? color['accent-ink'] : 'inherit',
              '&:hover': { color: color['text-secondary'] },
              ...col.cellSx,
            }}
          >
            {col.header}
            <SortIcon sx={{ fontSize: 12, opacity: isSorted ? 1 : 0.4 }} />
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// Skeleton / empty states
// ============================================================================

function CrmSkeletonRows({
  rowCount,
  colCount,
  gridTemplate,
  rowHeight,
}: {
  rowCount: number;
  colCount: number;
  gridTemplate: string;
  rowHeight: string;
}): JSX.Element {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Box
          key={`crm-skeleton-${rowIndex}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: gridTemplate,
            alignItems: 'center',
            px: crm['row-gutter'],
            minHeight: rowHeight,
            backgroundColor: rowIndex % 2 ? color['surface-alt'] : color.surface,
          }}
        >
          {Array.from({ length: colCount }).map((__, colIndex) => (
            <Box key={colIndex} sx={{ pr: 1.5 }}>
              <Skeleton variant="text" width="70%" height={16} />
            </Box>
          ))}
        </Box>
      ))}
    </>
  );
}

function CrmDefaultEmptyState({ message }: { message: string }): JSX.Element {
  return (
    <Box
      sx={{
        py: 7,
        px: crm['page-pad-x'],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color['canvas-sunken'],
          color: color['text-tertiary'],
        }}
      >
        <InboxOutlinedIcon sx={{ fontSize: 22 }} />
      </Box>
      <Box sx={{ fontSize: 14, fontWeight: 700 }}>{message}</Box>
    </Box>
  );
}

// ============================================================================
// CrmTable
// ============================================================================

/**
 * The CRM data grid behind Sales & CRM list views.
 *
 * ── Why this exists alongside `AdvancedTable` ─────────────────────────────
 * `AdvancedTable` is a MUI `<Table>` serving 19 list pages. This surface is a
 * CSS grid, because the design needs things a `<table>` cannot express cleanly:
 * an expanded row that lifts *out* of the flow into its own shadowed card with
 * a margin and a gradient spine, a nested sub-grid inside it, and a floating
 * pill selection bar overlaying the body. Bending `AdvancedTable` into that
 * shape meant escape-hatch props on a component 19 other pages depend on.
 *
 * ── What is deliberately NOT reimplemented ───────────────────────────────
 * Filtering. `filterColumns` / `filterModel` / `onFilterChange` are the exact
 * `AdvancedTable` contract, handed to the same `TableFilters` popover and
 * `TableFiltersToggle` badge. Filter behaviour is therefore shared code, not a
 * parallel implementation that can drift — which matters because the customer
 * list's property-level filters carry real backend semantics.
 *
 * Pagination, sort and search remain fully controlled by the caller (normally
 * `useTableUrlState`), so state stays bookmarkable and server-driven.
 */
export function CrmTable<TRow>({
  columns,
  rows,
  getRowId,
  loading = false,
  refetching = false,

  density = 'comfortable',
  zebra = true,
  accentSpine = true,

  initialSearch = '',
  onSearchChange,
  searchPlaceholder = 'Search…',

  quickFilters,
  activeQuickFilter,
  onQuickFilterChange,

  filterColumns,
  filterModel,
  onFilterChange,

  sortModel = null,
  onSortChange,

  page = 0,
  pageSize = 10,
  totalRowCount,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,

  enableRowSelection = false,
  bulkActions,
  onRowSelectionChange,
  selectionLabel,

  renderExpandedRow,
  defaultExpandedRowIds,

  onRowClick,

  renderEmptyState,
  emptyMessage = 'No results found.',

  itemLabel = 'rows',
  toolbarActions,
  sx,
}: CrmTableProps<TRow>): JSX.Element {
  // ── Local UI state ───────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [visibleColumnFields, setVisibleColumnFields] = useState<Set<string>>(
    () => new Set(columns.filter((c) => !c.defaultHidden).map((c) => c.field)),
  );

  // `defaultExpandedRowIds` seeds the initial state only. Re-applying it on every
  // change would re-open a row the user just collapsed on the next data refetch.
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(
    () => new Set(defaultExpandedRowIds ?? []),
  );

  // Rebuild visibility when the column *set* changes (not on every columns
  // identity change — memoised column arrays are recreated whenever their
  // dynamic filter options change, which must not reset the user's choices).
  const columnFieldsKey = columns.map((c) => c.field).join(',');
  const prevColumnFieldsKeyRef = useRef(columnFieldsKey);
  useEffect(() => {
    if (columnFieldsKey === prevColumnFieldsKeyRef.current) return;
    prevColumnFieldsKeyRef.current = columnFieldsKey;
    setVisibleColumnFields(new Set(columns.filter((c) => !c.defaultHidden).map((c) => c.field)));
  }, [columnFieldsKey, columns]);

  // ── Search ───────────────────────────────────────────────────────────────

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  // Seeded with the current debounced value so the first effect run is a no-op.
  // Without this, StrictMode's double invocation (and mount with an empty input)
  // would push an empty search up and wipe a URL-restored search term.
  const lastNotifiedSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    if (lastNotifiedSearchRef.current === debouncedSearch) return;
    lastNotifiedSearchRef.current = debouncedSearch;
    onSearchChangeRef.current?.(debouncedSearch);
  }, [debouncedSearch]);

  const handleSearchInput = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback((): void => setSearchQuery(''), []);

  // ── Derived layout ───────────────────────────────────────────────────────

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleColumnFields.has(c.field)),
    [columns, visibleColumnFields],
  );

  /**
   * The grid template is assembled from theme tokens: the fixed leading tracks
   * for selection and the expand caret, then one track per visible column. That
   * is what lets column visibility re-flow the grid with no hardcoded widths.
   */
  const gridTemplate = useMemo(
    () =>
      [
        enableRowSelection ? crm['col-select'] : null,
        renderExpandedRow ? crm['col-caret'] : null,
        ...visibleColumns.map((c) => c.track),
      ]
        .filter(Boolean)
        .join(' '),
    [enableRowSelection, renderExpandedRow, visibleColumns],
  );

  const leadingColCount = (enableRowSelection ? 1 : 0) + (renderExpandedRow ? 1 : 0);
  const rowHeight = density === 'compact' ? crm['row-height-compact'] : crm['row-height'];
  const effectiveTotal = totalRowCount ?? rows.length;

  // ── Selection ────────────────────────────────────────────────────────────

  const rowIds = useMemo(() => rows.map(getRowId), [rows, getRowId]);

  // Drop ids that left the page without hard-resetting the set. A blanket reset
  // on every `rows` identity change loops forever when a parent hands back a
  // fresh-but-equivalent array each render.
  useEffect(() => {
    setSelectedRowIds((prev) => {
      if (prev.size === 0) return prev;
      const available = new Set(rowIds);
      const next = new Set(Array.from(prev).filter((id) => available.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rowIds]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowIds.has(getRowId(row))),
    [rows, selectedRowIds, getRowId],
  );

  const onRowSelectionChangeRef = useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;
  useEffect(() => {
    onRowSelectionChangeRef.current?.(selectedRows);
  }, [selectedRows]);

  const { allSelected, someSelected } = useMemo(() => {
    if (rowIds.length === 0) return { allSelected: false, someSelected: false };
    const all = rowIds.every((id) => selectedRowIds.has(id));
    return { allSelected: all, someSelected: !all && rowIds.some((id) => selectedRowIds.has(id)) };
  }, [rowIds, selectedRowIds]);

  const handleSelectAll = useCallback(
    (checked: boolean): void => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (checked) rowIds.forEach((id) => next.add(id));
        else rowIds.forEach((id) => next.delete(id));
        return next;
      });
    },
    [rowIds],
  );

  const handleSelectRow = useCallback((id: string, checked: boolean): void => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback((): void => setSelectedRowIds(new Set()), []);

  // ── Expansion ────────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string): void => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Sort ─────────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (column: CrmColumn<TRow>): void => {
      if (!onSortChange) return;
      const field = column.sortField ?? column.field;
      if (sortModel?.field !== field) {
        onSortChange({ field, direction: 'asc' });
        return;
      }
      // asc → desc → unsorted, matching AdvancedTable's three-state cycle.
      const nextDirection = toggleSortDirection(sortModel.direction);
      onSortChange(nextDirection ? { field, direction: nextDirection } : null);
    },
    [onSortChange, sortModel],
  );

  // ── Filters ──────────────────────────────────────────────────────────────

  const filters: FilterState = filterModel ?? {};
  const hasFilterableColumns = Boolean(filterColumns?.some((c) => c.filterable));

  const handleToggleFilters = useCallback((e: React.MouseEvent<HTMLButtonElement>): void => {
    setFilterAnchorEl((prev) => (prev ? null : e.currentTarget));
  }, []);

  const handleCloseFilters = useCallback((): void => setFilterAnchorEl(null), []);

  // `TableFilters` is memoised, so it needs a stable callback identity to be
  // worth memoising at all.
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const handleFilterChange = useCallback((next: FilterState): void => {
    onFilterChangeRef.current?.(next);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      debouncedSearch.length > 0 ||
      Object.values(filters).some((v) => v !== '' && v != null) ||
      Boolean(activeQuickFilter),
    [debouncedSearch, filters, activeQuickFilter],
  );

  // ── Column visibility ────────────────────────────────────────────────────

  const handleToggleColumn = useCallback((field: string): void => {
    setVisibleColumnFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  const showSelectionBar =
    enableRowSelection && selectedRowIds.size > 0 && bulkActions && bulkActions.length > 0;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: crm['table-min-height'],
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: color.surface,
        borderRadius: radius['card-functional'],
        boxShadow: shadow.e2,
        overflow: 'hidden',
        position: 'relative',
        ...sx,
      }}
    >
      <CrmTableToolbar
        columns={columns}
        visibleColumns={visibleColumnFields}
        onToggleColumn={handleToggleColumn}
        searchQuery={searchQuery}
        onSearchInput={handleSearchInput}
        onClearSearch={handleClearSearch}
        searchPlaceholder={searchPlaceholder}
        enableSearch={Boolean(onSearchChange)}
        quickFilters={quickFilters}
        activeQuickFilter={activeQuickFilter}
        onQuickFilterChange={onQuickFilterChange}
        showFilters={hasFilterableColumns}
        filterModel={filters}
        filtersOpen={Boolean(filterAnchorEl)}
        onToggleFilters={handleToggleFilters}
        showColumnVisibility={columns.some((c) => c.hideable !== false && c.header !== '')}
        toolbarActions={toolbarActions}
      />

      {/* Background-refetch indicator. Always mounted at zero opacity so
          toggling it never shifts the grid down by 2px. */}
      <LinearProgress
        sx={{
          height: 2,
          opacity: refetching ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />

      {/* The shared filter popover + active-filter chip row. */}
      {hasFilterableColumns && filterColumns ? (
        <TableFilters
          columns={filterColumns}
          filters={filters}
          anchorEl={filterAnchorEl}
          onClose={handleCloseFilters}
          onFilterChange={handleFilterChange}
        />
      ) : null}

      <Box sx={{ flex: 1, minHeight: 280, overflow: 'auto' }}>
        <Box sx={{ minWidth: crm['grid-min-width'] }}>
          <CrmTableHead
            columns={visibleColumns}
            gridTemplate={gridTemplate}
            sortModel={sortModel}
            onSort={handleSort}
            enableRowSelection={enableRowSelection}
            hasExpandableRows={Boolean(renderExpandedRow)}
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={handleSelectAll}
          />

          {loading ? (
            <CrmSkeletonRows
              rowCount={pageSize}
              colCount={visibleColumns.length + leadingColCount}
              gridTemplate={gridTemplate}
              rowHeight={rowHeight}
            />
          ) : rows.length === 0 ? (
            (renderEmptyState?.(hasActiveFilters) ?? (
              <CrmDefaultEmptyState message={emptyMessage} />
            ))
          ) : (
            rows.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isExpanded = expandedRowIds.has(rowId);
              const isSelected = selectedRowIds.has(rowId);

              const zebraBackground = zebra && rowIndex % 2 ? color['surface-alt'] : color.surface;
              // An expanded row becomes its own card, so it always reads as
              // `surface` regardless of its zebra position or selection.
              const rowBackground = isExpanded
                ? color.surface
                : isSelected
                  ? color['accent-subtle']
                  : zebraBackground;
              const hoverBackground = isExpanded
                ? color.surface
                : isSelected
                  ? color['accent-subtle']
                  : color['canvas-sunken'];

              return (
                <Box
                  key={rowId}
                  sx={{
                    position: 'relative',
                    ...(isExpanded
                      ? {
                          backgroundColor: color.surface,
                          boxShadow: shadow.e3,
                          borderRadius: radius['rf-lg'],
                          m: 1,
                          overflow: 'hidden',
                          zIndex: 2,
                        }
                      : { backgroundColor: 'transparent' }),
                  }}
                >
                  {/* Gradient spine — the mark of an open row. */}
                  {isExpanded && accentSpine ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: crm['spine-width'],
                        borderRadius: crm['spine-radius'],
                        background: gradient.brand,
                        pointerEvents: 'none',
                      }}
                    />
                  ) : null}

                  <Box
                    onClick={() => {
                      if (renderExpandedRow) toggleExpand(rowId);
                      onRowClick?.(row);
                    }}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: gridTemplate,
                      alignItems: 'center',
                      px: crm['row-gutter'],
                      minHeight: rowHeight,
                      cursor: renderExpandedRow || onRowClick ? 'pointer' : 'default',
                      transition: 'background var(--dur-micro) var(--ease-standard)',
                      backgroundColor: rowBackground,
                      '&:hover': { backgroundColor: hoverBackground },
                    }}
                  >
                    {enableRowSelection ? (
                      <Box
                        sx={{ display: 'flex', alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e.target.checked)}
                          inputProps={{ 'aria-label': 'Select row' }}
                          sx={{ p: 0.5 }}
                        />
                      </Box>
                    ) : null}

                    {renderExpandedRow ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {/* A real button, not a decorated span: expanding a row
                            is the primary interaction on this grid, and the row
                            wrapper itself is a div that keyboard users cannot
                            reach. This is the only keyboard path to the panel. */}
                        <Box
                          component="button"
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          onClick={(e: React.MouseEvent) => {
                            // The row wrapper also toggles; without this the
                            // click would toggle twice and collapse instantly.
                            e.stopPropagation();
                            toggleExpand(rowId);
                          }}
                          sx={{
                            width: crm['caret-size'],
                            height: crm['caret-size'],
                            padding: 0,
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform var(--dur-standard) var(--ease-spring)',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            backgroundColor: isExpanded ? color['accent-subtle'] : 'transparent',
                            color: isExpanded ? color['accent-ink'] : color['text-tertiary'],
                          }}
                        >
                          <ChevronRightIcon sx={{ fontSize: 15 }} />
                        </Box>
                      </Box>
                    ) : null}

                    {visibleColumns.map((col) => (
                      <Box
                        key={col.field}
                        onClick={col.stopPropagation ? (e) => e.stopPropagation() : undefined}
                        sx={{
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                          ...col.cellSx,
                        }}
                      >
                        {col.renderCell(row)}
                      </Box>
                    ))}
                  </Box>

                  {renderExpandedRow && isExpanded ? renderExpandedRow(row) : null}
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      <CrmTablePagination
        page={page}
        pageSize={pageSize}
        totalRowCount={effectiveTotal}
        pageSizeOptions={pageSizeOptions}
        itemLabel={itemLabel}
        onPageChange={onPageChange ?? (() => undefined)}
        onPageSizeChange={onPageSizeChange ?? (() => undefined)}
      />

      {showSelectionBar ? (
        <CrmSelectionBar
          selectedRows={selectedRows}
          label={selectionLabel?.(selectedRowIds.size) ?? `${selectedRowIds.size} selected`}
          actions={bulkActions}
          onClear={handleClearSelection}
        />
      ) : null}
    </Box>
  );
}
