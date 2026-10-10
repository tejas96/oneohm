import type { SortOption } from '@/components/shared/calm-list';
import type { TableUrlSortModel } from '@/lib/hooks';

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

const KNOWN_FIELDS = new Set(['createdAt', 'name', 'city']);

/**
 * Which option a sort model reads as — always the one whose request is the one
 * actually sent. A hand-edited field the API mapping does not know falls back
 * to the created date there (`toApiSortField`) while its direction is still
 * honoured (`toApiSortOrder`), so `{"field":"bogus","direction":"asc"}` is sent
 * as created-date ascending and reads "Oldest first".
 */
export function customerSortIndex(model: TableUrlSortModel | null): number {
  if (!model) return 0;
  const field = KNOWN_FIELDS.has(model.field) ? model.field : 'createdAt';
  const direction = model.direction === 'asc' ? 'asc' : 'desc';
  if (field === 'createdAt' && direction === 'desc') return 0;
  const index = CUSTOMER_SORT_OPTIONS.findIndex(
    (option) => option.model?.field === field && option.model.direction === direction,
  );
  return index === -1 ? 0 : index;
}
