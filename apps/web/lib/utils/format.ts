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
} from '@oneohm-epc/shared/utils';

export function formatLabel(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
