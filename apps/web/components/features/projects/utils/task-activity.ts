import type { TaskActivityEntry } from '@tejas96/shared/types';

/**
 * Returns the most recent comment text from a task's activity log.
 * Entries are prepended on add, so the first `commented` entry is the latest.
 */
export function getLatestTaskComment(activityLog?: TaskActivityEntry[]): string | null {
  const entry = (activityLog ?? []).find(
    (e) => e.activityType === 'commented' && e.newValue?.trim(),
  );
  return entry?.newValue?.trim() ?? null;
}

/** Collapse whitespace/newlines for single-line row preview. */
export function collapseCommentPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
