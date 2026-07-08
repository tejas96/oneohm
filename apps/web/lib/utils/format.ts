export {
  formatCurrency,
  formatCurrencyDecimal,
  formatCurrencyCompact,
  formatDate,
  formatNumber,
  formatRelativeDate,
  formatTimeAgo,
  getInitials,
  formatRoleCode,
  formatSystemSize,
} from '@tejas96/shared/utils';

import { formatSystemSize } from '@tejas96/shared/utils';

export function formatLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Convert enum-like or snake_case values to user-friendly title labels.
 * Example: "SITE_VISIT_DONE" -> "Site Visit Done"
 */
export function toTitleLabel(raw: string): string {
  return raw
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Return a Tailwind text-color class based on whether a due date is overdue,
 * due today, or in the future.
 */
export function getDueDateColor(endDate?: string): string {
  if (!endDate) return 'text-foreground-tertiary';
  const d = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (d < now) return 'text-error';
  if (d.getTime() === now.getTime()) return 'text-warning';
  return 'text-foreground-secondary';
}

/**
 * Return an MUI theme color token based on whether a due date is overdue,
 * due today, or in the future. Use this in `sx` props instead of getDueDateColor.
 */
export function getDueDateMuiColor(endDate?: string): string {
  if (!endDate) return 'text.disabled';
  const d = new Date(endDate);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (d < now) return 'error.main';
  if (d.getTime() === now.getTime()) return 'warning.main';
  return 'text.secondary';
}

const MS_PER_DAY = 86_400_000;

function getDueDateDayDiff(endDate: string): number {
  const target = new Date(endDate);
  if (Number.isNaN(target.getTime())) return Number.NaN;
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Compact pending-days label for task row due-date column.
 * Returns "Today" | "3d late" | "in 5d".
 */
export function formatDueDatePendingLabel(endDate: string): string {
  const diffDays = getDueDateDayDiff(endDate);
  if (Number.isNaN(diffDays)) return '';
  if (diffDays < 0) return `${Math.abs(diffDays)}d late`;
  if (diffDays === 0) return 'Today';
  return `in ${diffDays}d`;
}

/**
 * Plain-string fallback for contexts that cannot render JSX (e.g. subtitle string building).
 * Shows actual as primary. Appends "(sel. X kW)" only when actual differs from requested.
 */
export function formatSystemSizeDisplay(actual?: number, requested?: number): string {
  const primary = actual ?? requested;
  if (primary == null) return '—';
  const primaryStr = `${formatSystemSize(primary)} kW`;
  if (actual != null && requested != null && Math.abs(actual - requested) > 0.01) {
    return `${primaryStr} (sel. ${formatSystemSize(requested)} kW)`;
  }
  return primaryStr;
}
