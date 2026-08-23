export {
  formatCurrency,
  formatCurrencyDecimal,
  formatCurrencyCompact,
  formatDate,
  formatFollowupClockTime,
  formatFollowupWhen,
  formatNumber,
  formatRelativeDate,
  formatTimeAgo,
  getInitials,
  formatRoleCode,
  formatSystemSize,
} from '@tejas96/shared/utils';

import { formatDate, formatSystemSize } from '@tejas96/shared/utils';

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
 */
export function formatSystemSizeDisplay(kw?: number): string {
  if (kw == null) return '—';
  return `${formatSystemSize(kw)} kW`;
}

/**
 * Render a business date (`YYYY-MM-DD`, no time component) as that calendar
 * date, whatever the viewer's timezone.
 *
 * `new Date('2026-08-12')` parses as UTC midnight and `toLocaleDateString`
 * then renders it locally, so anywhere west of UTC it shows 11 Aug. Value
 * dates and due dates are business dates and must not shift. Real timestamps
 * are instants and belong in `formatDate` unchanged.
 */
export function formatBusinessDate(value: string | null | undefined): string {
  if (!value) return '';
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return formatDate(value);
  const [, y, m, d] = parts;
  return formatDate(new Date(Number(y), Number(m) - 1, Number(d)));
}

/** Serialize a local calendar day as YYYY-MM-DD (never use toISOString for business dates). */
export function formatLocalDate(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function parseLocalDate(isoDate: string | undefined): Date | undefined {
  if (!isoDate) return undefined;
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
