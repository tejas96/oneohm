'use client';

import type { GroupByMode } from '@tejas96/shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LAZY_PROJECT_INITIAL_EXPAND_COUNT, SMART_EXPAND_DEFAULTS } from '../constants';

const STORAGE_KEY_PREFIX = 'my-tasks-collapsed-';

function readFromStorage(groupBy: GroupByMode): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${groupBy}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
  } catch {
    return null;
  }
}

function writeToStorage(groupBy: GroupByMode, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${groupBy}`, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
  }
}

function getSmartDefaults(groupBy: GroupByMode): Record<string, boolean> {
  return SMART_EXPAND_DEFAULTS[groupBy] ?? {};
}

interface UseCollapsedGroupsOptions {
  /** When true, ignore stored expand-all state and cap initial fetches to first N projects. */
  lazyProjectGroups?: boolean;
}

export function useCollapsedGroups(
  groupBy: GroupByMode,
  groupKeys: string[],
  options?: UseCollapsedGroupsOptions,
) {
  const lazyProjectGroups = options?.lazyProjectGroups ?? false;
  const userToggledKeysRef = useRef(new Set<string>());

  const [expandedState, setExpandedState] = useState<Record<string, boolean>>(() => {
    const stored = readFromStorage(groupBy);
    if (stored) return stored;
    return getSmartDefaults(groupBy);
  });

  useEffect(() => {
    userToggledKeysRef.current.clear();
  }, [groupBy, lazyProjectGroups, groupKeys.length]);

  const markUserToggled = useCallback((keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      userToggledKeysRef.current.add(key);
    }
  }, []);

  const isExpanded = useCallback(
    (key: string): boolean => {
      if (lazyProjectGroups && groupBy === 'project') {
        const idx = groupKeys.indexOf(key);
        if (idx < 0) return false;
        if (userToggledKeysRef.current.has(key)) {
          if (key in expandedState) return expandedState[key] ?? true;
          return idx < LAZY_PROJECT_INITIAL_EXPAND_COUNT;
        }
        return idx < LAZY_PROJECT_INITIAL_EXPAND_COUNT;
      }

      if (key in expandedState) return expandedState[key] ?? true;
      const defaults = getSmartDefaults(groupBy);
      if (key in defaults) return defaults[key] ?? true;
      if (groupBy === 'project') {
        const idx = groupKeys.indexOf(key);
        return idx >= 0 && idx < LAZY_PROJECT_INITIAL_EXPAND_COUNT;
      }
      return true;
    },
    [expandedState, groupBy, groupKeys, lazyProjectGroups],
  );

  const toggle = useCallback(
    (key: string) => {
      markUserToggled(key);
      setExpandedState((prev) => {
        const next = { ...prev, [key]: !isExpanded(key) };
        writeToStorage(groupBy, next);
        return next;
      });
    },
    [groupBy, isExpanded, markUserToggled],
  );

  const expandAll = useCallback(() => {
    markUserToggled(groupKeys);
    const next: Record<string, boolean> = {};
    for (const key of groupKeys) {
      next[key] = true;
    }
    setExpandedState(next);
    writeToStorage(groupBy, next);
  }, [groupBy, groupKeys, markUserToggled]);

  const collapseAll = useCallback(() => {
    markUserToggled(groupKeys);
    const next: Record<string, boolean> = {};
    for (const key of groupKeys) {
      next[key] = false;
    }
    setExpandedState(next);
    writeToStorage(groupBy, next);
  }, [groupBy, groupKeys, markUserToggled]);

  const expandOnly = useCallback(
    (keys: string[]) => {
      markUserToggled(keys);
      setExpandedState((prev) => {
        const next = { ...prev };
        for (const key of keys) {
          next[key] = true;
        }
        writeToStorage(groupBy, next);
        return next;
      });
    },
    [groupBy, markUserToggled],
  );

  const canLazyFetch = useCallback(
    (key: string): boolean => {
      if (!lazyProjectGroups || groupBy !== 'project') return true;
      if (!isExpanded(key)) return false;
      const idx = groupKeys.indexOf(key);
      if (idx < LAZY_PROJECT_INITIAL_EXPAND_COUNT) return true;
      return userToggledKeysRef.current.has(key);
    },
    [groupBy, groupKeys, isExpanded, lazyProjectGroups],
  );

  const allExpanded = groupKeys.length > 0 && groupKeys.every((k) => isExpanded(k));

  return { isExpanded, canLazyFetch, toggle, expandAll, expandOnly, collapseAll, allExpanded };
}
