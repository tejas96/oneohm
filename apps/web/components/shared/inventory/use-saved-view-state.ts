'use client';

import { useMemo } from 'react';

import { stableHash } from '@/lib/hooks/core/query-keys';
import type { SavedView, SavedViewResource } from '@/lib/hooks/resources';

/**
 * Modified-state machine for the SavedViewsBar.
 *
 * Inputs:
 *   - `views`        the current user's saved views for this resource
 *                    (already scoped by org + user via the FDAL hook).
 *   - `activeId`     the value of the URL `?view=<id>` param (or `null`
 *                    when "All" is implicitly selected).
 *   - `currentFilters` the live filter object from `useTableUrlState`.
 *
 * Outputs (memoised):
 *   - `selectedView` resolved view | null. Returns `null` when activeId
 *                    is missing OR points to a view the user no longer
 *                    has (deleted in another tab, or the user lost
 *                    access). Consumers MUST check this before treating
 *                    a non-null `activeId` as authoritative — silently
 *                    strip stale `?view` params from the URL when this
 *                    is null but `activeId` was set.
 *   - `isModified`   true when a view is selected AND the filter
 *                    fingerprint differs from the saved one. Tagged on
 *                    a hash compare via `stableHash` so key order &
 *                    null/empty stripping don't produce false dirties.
 *   - `status`       narrowed enum ('all' | 'fresh' | 'modified' |
 *                    'stale') so consumers don't have to recompute it.
 *
 * Why a separate hook (not folded into the bar): the rebuild-* parts
 * will want to read `isModified` from elsewhere on the page (e.g. a
 * top-of-page toolbar showing "You have unsaved filter changes" or
 * disabling an inline "Update view" button). Centralising the logic
 * keeps that consistent.
 */

export type SavedViewStatus = 'all' | 'fresh' | 'modified' | 'stale';

export interface UseSavedViewStateOptions {
  /** Resource the bar is mounted for. Used only for memo keys today. */
  resource: SavedViewResource;
  /** All saved views for the user/resource. */
  views: SavedView[];
  /** The current URL `?view=<id>` value, or null/undefined for "All". */
  activeId: string | null | undefined;
  /** The current filter object from `useTableUrlState`. */
  currentFilters: Record<string, unknown>;
}

export interface UseSavedViewStateReturn {
  selectedView: SavedView | null;
  isModified: boolean;
  status: SavedViewStatus;
  /**
   * Stable hash of `currentFilters` exposed for callers that want to
   * memoise on it (e.g. an effect that auto-saves on filter change).
   */
  currentFiltersHash: string;
}

export function useSavedViewState(opts: UseSavedViewStateOptions): UseSavedViewStateReturn {
  const { views, activeId, currentFilters } = opts;

  const currentFiltersHash = useMemo(() => stableHash(currentFilters), [currentFilters]);

  const selectedView = useMemo<SavedView | null>(() => {
    if (!activeId) return null;
    return views.find((v) => v.id === activeId) ?? null;
  }, [views, activeId]);

  const { isModified, status } = useMemo<{
    isModified: boolean;
    status: SavedViewStatus;
  }>(() => {
    if (!activeId) return { isModified: false, status: 'all' };
    if (!selectedView) {
      // The URL points to a view the user can no longer see — likely
      // deleted in another tab. Consumers should silently strip
      // `?view` from the URL; in the meantime we mark it 'stale' so
      // the bar can render the "All" chip selected and avoid a flash
      // of a non-existent named chip.
      return { isModified: false, status: 'stale' };
    }
    const savedHash = stableHash(selectedView.filters);
    const same = savedHash === currentFiltersHash;
    return {
      isModified: !same,
      status: same ? 'fresh' : 'modified',
    };
  }, [activeId, selectedView, currentFiltersHash]);

  return { selectedView, isModified, status, currentFiltersHash };
}
