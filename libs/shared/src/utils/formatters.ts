/**
 * Format a number as Indian Rupees (e.g., "₹4,50,000")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/**
 * Format a number as Indian Rupees preserving up to 2 decimal places.
 * Use for per-unit prices (e.g., ₹25.75/W).
 */
export function formatCurrencyDecimal(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**
 * Format a number as compact Indian Rupees (e.g., "₹4.5L")
 */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(amount));
}

/**
 * Format a date string/Date to a readable format.
 * - 'short': "15 Feb 2026"
 * - 'medium': "Feb 15, 2026"
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

  if (diffDays < 0)
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays <= 7) return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  return formatDate(d, 'medium');
}

/**
 * Format a past timestamp as a human-readable "time ago" string.
 */
export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = Date.now();
  const diffMs = now - d.getTime();

  if (diffMs < 0) return formatDate(d, 'medium');

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  return formatDate(d, 'medium');
}

/**
 * Get initials from a full name (e.g., "John Doe" → "JD")
 */
export function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Get full name from first and last name
 */
export function getFullName(firstName?: string, lastName?: string): string {
  return `${firstName || ''} ${lastName || ''}`.trim() || '';
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format a role/permission code for human-readable display.
 * Converts snake_case codes to Title Case (e.g., "employee_basic" → "Employee Basic").
 */
export function formatRoleCode(code: string): string {
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a number with Indian grouping (e.g., 1,50,000)
 */
export function formatNumber(num: number | null | undefined): string {
  if (num == null || Number.isNaN(Number(num))) return '0';
  return new Intl.NumberFormat('en-IN').format(Number(num));
}

/** Format system size: strips trailing zeros (e.g. "7.00" → "7", "7.50" → "7.5") */
export function formatSystemSize(kw: number | string): string {
  const n = typeof kw === 'string' ? parseFloat(kw) : kw;
  if (Number.isNaN(n)) return '0';
  return n % 1 === 0 ? String(Math.round(n)) : String(parseFloat(n.toFixed(2)));
}
