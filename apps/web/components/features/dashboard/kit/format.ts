import { formatNumber, formatSystemSize } from '@tejas96/shared/utils';

import { formatPaise } from '@/lib/utils/paise';

/** "842 kW" for big totals, "46.5 kW" below 100. */
export function formatKw(kw: number): string {
  if (kw >= 100) return `${formatNumber(Math.round(kw))} kW`;
  return `${formatSystemSize(Math.round(kw * 10) / 10)} kW`;
}

export function formatCount(n: number): string {
  return formatNumber(Math.round(n));
}

/** Same compact form the receivables page uses, so the two screens read alike. */
export function formatPaiseCompact(paise: number): string {
  return formatPaise(Math.round(paise), { compact: true });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Oct", or "Jan 26" so the year change is visible on the axis. */
export function monthLabel(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  return m === 1 ? `Jan ${String(y).slice(2)}` : (MONTHS[m - 1] ?? '');
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}
