/**
 * Get initials from a full name (e.g., "John Doe" → "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const currencyDecimalFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format a number as Indian Rupees (e.g., "₹4,50,000")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0';
  return currencyFormatter.format(Number(amount));
}

/**
 * Format a number as Indian Rupees preserving up to 2 decimal places.
 * Use for per-unit prices (e.g., ₹25.75/W) where rounding distorts the value.
 */
export function formatCurrencyDecimal(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0';
  return currencyDecimalFormatter.format(Number(amount));
}

/**
 * Format a number as compact Indian Rupees (e.g., "₹4.5L")
 * Useful for table views where space is limited
 */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0';
  return compactCurrencyFormatter.format(Number(amount));
}

/**
 * Format a date string/Date to a readable format.
 * - 'short': "Feb 15" (month + day only)
 * - 'medium': "Feb 15, 2026" (default)
 * - 'long': "February 15, 2026"
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { month: 'short', day: 'numeric' }
      : format === 'long'
        ? { month: 'long', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };

  return d.toLocaleDateString('en-IN', options);
}

/**
 * Format a date relative to now for due-date display.
 * Returns "Overdue by X days", "Due today", "Due in X days", or the formatted date.
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays <= 7) return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  return formatDate(d, 'medium');
}

/** Format system size: strips trailing zeros (e.g. "7.00" → "7", "7.50" → "7.5") */
export function formatSystemSize(kw: number | string): string {
  const n = typeof kw === 'string' ? parseFloat(kw) : kw;
  if (Number.isNaN(n)) return '0';
  return n % 1 === 0 ? String(Math.round(n)) : String(parseFloat(n.toFixed(2)));
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
