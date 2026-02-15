'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import * as React from 'react';

import { TablePagination } from './pagination';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';


// ============================================================================
// Types
// ============================================================================

export interface DataTableProps<TData, TValue> {
  /** Column definitions */
  columns: ColumnDef<TData, TValue>[];
  /** Data to display */
  data: TData[];
  /** Enable row selection */
  enableRowSelection?: boolean;
  /** Enable global search */
  enableSearch?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Column to filter on (for global search) */
  searchColumn?: string;
  /** Enable column visibility toggle */
  enableColumnVisibility?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Default page size */
  pageSize?: number;
  /** Pagination variant: 'full' for complete controls (default), 'simple' for "Showing X-Y of Z items" */
  paginationVariant?: 'full' | 'simple';
  /** Item label for pagination (e.g., "properties", "customers") - used with 'simple' variant */
  itemLabel?: string;
  /** Called when row selection changes */
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  /** Additional toolbar actions */
  toolbarActions?: React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Function to get row-level class names (for highlighting, etc.) */
  getRowClassName?: (row: TData) => string;
}

// ============================================================================
// Helper: Column Definition Helpers
// ============================================================================

/**
 * Create a sortable header for a column
 */
export function createSortableHeader(
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void },
  label: string
): React.ReactNode {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-semibold text-2xs uppercase tracking-wider"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className="ml-2 size-icon-sm" />
    </Button>
  );
}

/**
 * Create a selection column
 */
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        size="sm"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        size="sm"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  enableSearch = true,
  searchPlaceholder = 'Search...',
  searchColumn,
  enableColumnVisibility = false,
  enablePagination = true,
  pageSize = 10,
  paginationVariant = 'full',
  itemLabel = 'items',
  onRowSelectionChange,
  toolbarActions,
  emptyMessage = 'No results found.',
  isLoading = false,
  className,
  getRowClassName,
}: DataTableProps<TData, TValue>): React.JSX.Element {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  // Add selection column if enabled
  const finalColumns = React.useMemo(() => {
    if (enableRowSelection) {
      return [createSelectionColumn<TData>(), ...columns] as ColumnDef<TData, TValue>[];
    }
    return columns;
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Notify parent about row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, onRowSelectionChange, table]);

  const handleSearch = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const totalItems = table.getFilteredRowModel().rows.length;

  return (
    <div className={cn(className)}>
      {/* Table Container */}
      <div className="rounded-lg border border-border-light overflow-hidden">
        {/* Toolbar - inside table container */}
        {(enableSearch || enableColumnVisibility || toolbarActions) && (
          <div className="px-4 py-3 border-b border-border-light bg-background flex items-center justify-between gap-4">
            {/* Search */}
            {enableSearch && (
              <div className="flex-1 max-w-md">
                <Input
                  placeholder={searchPlaceholder}
                  value={searchColumn ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? '' : globalFilter}
                  onChange={(e) => handleSearch(e.target.value)}
                  leftIcon={<Search />}
                  size="default"
                />
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              {toolbarActions}

              {/* Column Visibility */}
              {enableColumnVisibility && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Columns <ChevronDown className="ml-2 size-icon-sm" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    sortable={header.column.getCanSort()}
                    sorted={header.column.getIsSorted()}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {finalColumns.map((_, cellIndex) => (
                    <TableCell key={`skeleton-cell-${cellIndex}`}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={getRowClassName?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Empty state
              <TableRow>
                <TableCell colSpan={finalColumns.length} className="h-24 text-center">
                  <p className="text-foreground-secondary">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {enablePagination && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={table.getState().pagination.pageSize}
            totalItems={totalItems}
            itemLabel={itemLabel}
            variant={paginationVariant}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            onPageSizeChange={(size) => table.setPageSize(size)}
          />
        )}
      </div>

      {/* Selection info */}
      {enableRowSelection && Object.keys(rowSelection).length > 0 && (
        <div className="text-sm text-foreground-secondary">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      )}
    </div>
  );
}
