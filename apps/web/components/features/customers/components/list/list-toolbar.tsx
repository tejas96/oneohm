'use client';

import { type ChangeEvent, type JSX, type MouseEvent, useEffect, useRef, useState } from 'react';

import type { CustomerRow } from './filter-columns';
import { CloseIcon, FiltersIcon, SearchIcon } from './icons';
import { SortMenu } from './sort-menu';

import { type ColumnConfig, TableFilters } from '@/components/shared/advanced-table';
import { type TableUrlFilterRecord, type TableUrlSortModel, useDebounce } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/** Matches `AdvancedTable` and `CrmTable`, so search feels the same across the app. */
const SEARCH_DEBOUNCE_MS = 300;

const GHOST =
  'flex flex-none items-center gap-2 rounded-input-expressive bg-surface px-4 py-3 text-[14px] text-foreground-secondary shadow-calm';

export interface ListToolbarProps {
  /** The search term in the URL. */
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder: string;
  filterColumns: ColumnConfig<CustomerRow>[];
  filters: TableUrlFilterRecord;
  onFilterChange: (filters: TableUrlFilterRecord) => void;
  sortModel: TableUrlSortModel | null;
  onSortChange: (model: TableUrlSortModel | null) => void;
  /** What the list holds now ("265 customers"); shown in the filter panel. */
  resultLabel?: string;
}

/**
 * Search · Filters · Sort, and under them the active-filter chips.
 *
 * The side panel and the chips are the shared `TableFilters`, handed the same
 * columns and filter model as before — filter behaviour is shared code here,
 * not a second implementation.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filterColumns,
  filters,
  onFilterChange,
  sortModel,
  onSortChange,
  resultLabel,
}: ListToolbarProps): JSX.Element {
  // ── Search: typed locally, pushed up after the debounce ───────────────────
  const [query, setQuery] = useState(search);
  const debounced = useDebounce(query, SEARCH_DEBOUNCE_MS);

  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  // Seeded with the current value so the first run is a no-op — otherwise a
  // mount (or StrictMode's second one) would push '' up and wipe a URL search.
  const lastNotified = useRef(debounced);
  useEffect(() => {
    if (lastNotified.current === debounced) return;
    lastNotified.current = debounced;
    onSearchChangeRef.current(debounced);
  }, [debounced]);

  // The URL changed under the box (Clear all filters, browser back): follow it.
  useEffect(() => {
    if (search === lastNotified.current) return;
    lastNotified.current = search;
    setQuery(search);
  }, [search]);

  // ── Filters side panel ───────────────────────────────────────────────────────
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  // `TableFilters` is memoised; give it a callback that never changes identity.
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  const handleFilterChange = useRef((next: TableUrlFilterRecord): void =>
    onFilterChangeRef.current(next),
  ).current;
  const closeFilters = useRef((): void => setFilterAnchor(null)).current;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <label
          className={cn(
            'flex min-w-[240px] flex-1 cursor-text items-center gap-2.5 rounded-input-expressive bg-surface px-4 py-3 shadow-calm',
            'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
          )}
        >
          <SearchIcon className="flex-none text-foreground-muted" />
          <input
            type="search"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search customers"
            autoComplete="off"
            className="min-w-0 flex-1 appearance-none bg-transparent py-px text-[14px] text-foreground outline-none placeholder:text-foreground-tertiary focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="grid size-6 flex-none place-items-center rounded-full text-foreground-secondary hover:bg-background-tertiary"
            >
              <CloseIcon size={14} />
            </button>
          ) : null}
        </label>

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={Boolean(filterAnchor)}
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
          onClick={(event: MouseEvent<HTMLButtonElement>) =>
            setFilterAnchor((open) => (open ? null : event.currentTarget))
          }
          // Open reads like a selected row: the same dark ring.
          className={cn(
            GHOST,
            'aria-expanded:text-foreground aria-expanded:ring-2 aria-expanded:ring-foreground',
          )}
        >
          <FiltersIcon />
          Filters
          {activeFilterCount > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-pill bg-foreground px-1.5 text-[11px] font-semibold tabular-nums text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <SortMenu sortModel={sortModel} onSortChange={onSortChange} className={GHOST} />
      </div>

      {/* Chips sit 4px in from the list's edge; the shared row brings its own 16px. */}
      <div className="-mx-3">
        <TableFilters
          columns={filterColumns}
          filters={filters}
          anchorEl={filterAnchor}
          onClose={closeFilters}
          onFilterChange={handleFilterChange}
          presentation="drawer"
          resultLabel={resultLabel}
        />
      </div>
    </div>
  );
}
