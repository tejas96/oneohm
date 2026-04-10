import type { ColumnConfig, FilterState, FilterType, SortDirection, TableSortModel } from './types';

// ============================================================================
// Sorting
// ============================================================================

export function sortRows<TRow>(
  rows: TRow[],
  sortModel: TableSortModel | null,
  columns: ColumnConfig<TRow>[],
): TRow[] {
  if (!sortModel) return rows;

  const col = columns.find((c) => c.field === sortModel.field);
  const sorted = [...rows].sort((a, b) => {
    const aVal = getNestedValue(a, sortModel.field);
    const bVal = getNestedValue(b, sortModel.field);

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (col?.type === 'date') {
      const aTime = new Date(aVal as string).getTime();
      const bTime = new Date(bVal as string).getTime();
      // Invalid dates (NaN) are sorted to the end
      if (isNaN(aTime) && isNaN(bTime)) return 0;
      if (isNaN(aTime)) return 1;
      if (isNaN(bTime)) return -1;
      return aTime - bTime;
    }

    if (col?.type === 'number' || typeof aVal === 'number') {
      return Number(aVal) - Number(bVal);
    }

    return toSortableString(aVal).localeCompare(toSortableString(bVal), undefined, {
      sensitivity: 'base',
    });
  });

  return sortModel.direction === 'desc' ? sorted.reverse() : sorted;
}

// ============================================================================
// Filtering
// ============================================================================

export function filterRows<TRow>(
  rows: TRow[],
  filters: FilterState,
  columns: ColumnConfig<TRow>[],
): TRow[] {
  const activeFilters = Object.entries(filters).filter(([, v]) => v !== '' && v != null);
  if (activeFilters.length === 0) return rows;

  return rows.filter((row) => {
    return activeFilters.every(([field, filterValue]) => {
      const col = columns.find((c) => c.field === field);
      const cellValue = getNestedValue(row, field);
      const filterType: FilterType | undefined = col?.filterType;

      switch (filterType) {
        case 'select':
          return toSortableString(cellValue) === toSortableString(filterValue);

        case 'date': {
          if (!filterValue || !cellValue) return true;
          const cellDate = new Date(cellValue as string).toDateString();
          const filterDate = new Date(filterValue as string).toDateString();
          return cellDate === filterDate;
        }

        case 'range': {
          const range = filterValue as { min?: number; max?: number };
          const num = Number(cellValue);
          // Non-numeric cells (NaN) fail the range filter rather than silently passing
          if (isNaN(num)) return false;
          if (range.min != null && num < range.min) return false;
          if (range.max != null && num > range.max) return false;
          return true;
        }

        case 'text':
        case undefined:
          return toSortableString(cellValue)
            .toLowerCase()
            .includes(toSortableString(filterValue).toLowerCase());
      }
    });
  });
}

// ============================================================================
// Global Search
// ============================================================================

export function globalSearchRows<TRow>(
  rows: TRow[],
  query: string,
  columns: ColumnConfig<TRow>[],
): TRow[] {
  if (!query.trim()) return rows;

  const searchable = columns.filter((c) => c.searchable !== false);
  const q = query.toLowerCase();

  return rows.filter((row) =>
    searchable.some((col) => {
      const value = getNestedValue(row, col.field);
      const display = col.valueFormatter ? col.valueFormatter(value) : toSortableString(value);
      return display.toLowerCase().includes(q);
    }),
  );
}

// ============================================================================
// Pagination (client-side)
// ============================================================================

export function paginateRows<TRow>(rows: TRow[], page: number, pageSize: number): TRow[] {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

// ============================================================================
// CSV Export
// ============================================================================

export function exportToCsv<TRow>(
  rows: TRow[],
  columns: ColumnConfig<TRow>[],
  filename = 'export.csv',
): void {
  const exportCols = columns.filter((c) => c.field !== 'actions');

  const header = exportCols.map((c) => escapeCell(c.headerName)).join(',');

  const body = rows
    .map((row) =>
      exportCols
        .map((col) => {
          const raw = getNestedValue(row, col.field);
          const display = col.valueFormatter ? col.valueFormatter(raw) : toSortableString(raw);
          return escapeCell(display);
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Helpers
// ============================================================================

/** Safely read dot-notation paths like "address.city" from an object */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function toggleSortDirection(current: SortDirection): SortDirection | null {
  if (current === 'asc') return 'desc';
  return null;
}

/**
 * Coerce an unknown value to a string safely, avoiding '[object Object]'.
 * Primitives convert naturally; objects/arrays fall back to JSON.
 */
export function toSortableString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
