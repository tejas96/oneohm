'use client';

import type { GroupByMode } from '@tejas96/shared/types';
import { useCallback, useState } from 'react';

import { SMART_EXPAND_DEFAULTS } from '../constants';

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

export function useCollapsedGroups(groupBy: GroupByMode, groupKeys: string[]) {
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>(() => {
    const stored = readFromStorage(groupBy);
    if (stored) return stored;
    return getSmartDefaults(groupBy);
  });

  const isExpanded = useCallback(
    (key: string): boolean => {
      if (key in expandedState) return expandedState[key] ?? true;
      const defaults = getSmartDefaults(groupBy);
      if (key in defaults) return defaults[key] ?? true;
      // For project grouping, expand first 3 by default
      if (groupBy === 'project') {
        const idx = groupKeys.indexOf(key);
        return idx >= 0 && idx < 3;
      }
      return true;
    },
    [expandedState, groupBy, groupKeys],
  );

  const toggle = useCallback(
    (key: string) => {
      setExpandedState((prev) => {
        const next = { ...prev, [key]: !isExpanded(key) };
        writeToStorage(groupBy, next);
        return next;
      });
    },
    [groupBy, isExpanded],
  );

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const key of groupKeys) {
      next[key] = true;
    }
    setExpandedState(next);
    writeToStorage(groupBy, next);
  }, [groupBy, groupKeys]);

  const collapseAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const key of groupKeys) {
      next[key] = false;
    }
    setExpandedState(next);
    writeToStorage(groupBy, next);
  }, [groupBy, groupKeys]);

  const allExpanded = groupKeys.length > 0 && groupKeys.every((k) => isExpanded(k));

  return { isExpanded, toggle, expandAll, collapseAll, allExpanded };
}
