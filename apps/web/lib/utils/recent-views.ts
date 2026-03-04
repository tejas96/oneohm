export type RecentViewType = 'customer' | 'quote' | 'project';

export interface RecentViewItem {
  id: string;
  type: RecentViewType;
  label: string;
  href: string;
}

const STORAGE_KEY_PREFIX = 'oneohm-recent-views';
const MAX_ITEMS = 10;

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}

export function getRecentViews(userId: string): RecentViewItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentView(userId: string, item: RecentViewItem): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentViews(userId);
    const filtered = existing.filter((v) => !(v.type === item.type && v.id === item.id));
    const updated = [item, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch {
    // Fail silently — localStorage may be full or unavailable (e.g. private browsing)
  }
}
