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

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format a number as Indian Rupees (e.g., "₹4,50,000")
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Format a number as compact Indian Rupees (e.g., "₹4.5L")
 * Useful for table views where space is limited
 */
export function formatCurrencyCompact(amount: number): string {
  return compactCurrencyFormatter.format(amount);
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
