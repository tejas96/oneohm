export { AdvancedTable } from './Table';
export { AdvancedTableExample } from './AdvancedTableExample';
export { AdvancedTableHeader } from './TableHeader';
export {
  FilterAutocomplete,
  TableFilters,
  TableFiltersToggle,
  type FilterAutocompleteOption,
} from './TableFilters';
export { AdvancedTablePagination } from './TablePagination';

export type {
  AdvancedTableProps,
  BulkAction,
  CellParams,
  ColumnConfig,
  ColumnType,
  FilterState,
  FilterType,
  PaginationMode,
  SortDirection,
  TableFilterModel,
  TableSortModel,
} from './types';

export {
  exportToCsv,
  filterRows,
  getNestedValue,
  globalSearchRows,
  paginateRows,
  sortRows,
  toggleSortDirection,
  toSortableString,
} from './utils';

// Re-export URL-sync hook so consumers can import from the table package directly
export { useTableUrlState } from '@/lib/hooks/use-table-url-state';
export type { TableUrlState } from '@/lib/hooks/use-table-url-state';
