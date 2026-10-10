import { createSortIndex, type SortOption } from '@/components/shared/calm-list';

/**
 * The three sortable fields the old column headers offered, both directions.
 * The models are the same `{ field, direction }` values the headers wrote, so
 * a saved `customers_sort` URL still means what it meant.
 */
export const CUSTOMER_SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', model: null },
  { label: 'Oldest first', model: { field: 'createdAt', direction: 'asc' } },
  { label: 'Name A–Z', model: { field: 'name', direction: 'asc' } },
  { label: 'Name Z–A', model: { field: 'name', direction: 'desc' } },
  { label: 'City A–Z', model: { field: 'city', direction: 'asc' } },
  { label: 'City Z–A', model: { field: 'city', direction: 'desc' } },
];

/**
 * A field the API mapping does not know falls back to the created date there
 * (`toApiSortField`) while its direction is still honoured (`toApiSortOrder`).
 */
export const customerSortIndex = createSortIndex(CUSTOMER_SORT_OPTIONS, 'createdAt');
