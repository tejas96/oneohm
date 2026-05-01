import type { ColumnConfig } from '@/components/shared/advanced-table';

/**
 * Defines a filter-only column: stays out of the visible grid (defaultHidden)
 * but appears in AdvancedTable's filter panel — same pattern as Customers /
 * Projects (filterable + filterType on column config, not ad-hoc toolbar
 * selects).
 *
 * **`field` must be unique across all columns** (including visible ones).
 * AdvancedTable keys header cells by `field`; duplicating a visible column's
 * `field` makes both rows match `visibleColumns` and triggers duplicate React
 * keys. Use a distinct `field` here and map it to API/query keys in the
 * parent's `filterModel` / `onFilterChange`.
 */
export function hiddenSelectFilterColumn<TRow extends Record<string, unknown>>(args: {
  field: string;
  headerName: string;
  filterOptions: ReadonlyArray<{ label: string; value: string | number }>;
}): ColumnConfig<TRow> {
  return {
    field: args.field,
    headerName: args.headerName,
    filterable: true,
    filterType: 'select',
    filterOptions: args.filterOptions,
    defaultHidden: true,
    hideable: false,
    width: 0,
    sortable: false,
    renderCell: () => null,
  };
}
