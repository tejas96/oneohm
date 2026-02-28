'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTaskKeyboardNavOptions {
  totalTasks: number;
  onOpenDrawer: (index: number) => void;
  onMarkDone: (index: number) => void;
  onStartTask: (index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}

export function useTaskKeyboardNav({
  totalTasks,
  onOpenDrawer,
  onMarkDone,
  onStartTask,
  onExpandAll,
  onCollapseAll,
  searchInputRef,
  drawerOpen,
  onCloseDrawer,
}: UseTaskKeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (drawerOpen) {
          onCloseDrawer();
          e.preventDefault();
          return;
        }
        if (isInput) {
          (target as HTMLInputElement).blur();
          e.preventDefault();
          return;
        }
      }

      // Don't handle keys when typing in inputs (except Escape)
      if (isInput) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, totalTasks - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0) onOpenDrawer(focusedIndex);
          break;
        case 'd':
          e.preventDefault();
          if (focusedIndex >= 0) onMarkDone(focusedIndex);
          break;
        case 's':
          e.preventDefault();
          if (focusedIndex >= 0) onStartTask(focusedIndex);
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'e':
          e.preventDefault();
          onExpandAll();
          break;
        case 'c':
          e.preventDefault();
          onCollapseAll();
          break;
      }
    },
    [
      totalTasks,
      focusedIndex,
      drawerOpen,
      onOpenDrawer,
      onMarkDone,
      onStartTask,
      onExpandAll,
      onCollapseAll,
      searchInputRef,
      onCloseDrawer,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused task into view
  useEffect(() => {
    if (focusedIndex < 0 || !containerRef.current) return;
    const rows = containerRef.current.querySelectorAll('[data-task-row]');
    const row = rows[focusedIndex];
    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  return { focusedIndex, setFocusedIndex, containerRef };
}
