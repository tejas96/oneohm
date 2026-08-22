/**
 * Indian money formatting for Business mode.
 *
 * Two forms, both needed on the same screen: the short form is what someone
 * reads across the room, the exact form sits under it so the figure can be
 * reconciled against `/finance`. The design shows both on the hero number.
 *
 * **Why not `lib/utils/paise.ts`.** That helper takes integer PAISE, and every
 * finance endpoint here returns RUPEES — `finance-reporting.service.ts` divides
 * by 100 before responding. Passing a rupee figure to `formatPaise` renders it
 * 100x too small. It also stops at lakh, and this screen needs crore, and it
 * always prints two decimals, which is wrong for a headline number.
 *
 * Nothing here computes with money; it only renders. Totals come from the API.
 */

/** Indian digit grouping — 1,42,10,450, not 142,10,450. */
export function groupIndian(value: number): string {
  const digits = String(Math.round(Math.abs(value)));
  if (digits.length <= 3) return digits;

  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

/** The exact figure: ₹1,42,10,450. Uses a real minus, not a hyphen. */
export function rupeesExact(value: number): string {
  return `${value < 0 ? '−₹' : '₹'}${groupIndian(value)}`;
}

/** The readable figure: ₹1.42 Cr / ₹6.25 L / ₹9,450. */
export function rupeesShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${groupIndian(abs)}`;
}

export type MoneyFormat = 'short' | 'full';

export function money(value: number, format: MoneyFormat): string {
  return format === 'full' ? rupeesExact(value) : rupeesShort(value);
}

/** A signed percentage for the period-over-period chips: +8.4% / −2.1%. */
export function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
}

/**
 * Whether a movement should read as good.
 *
 * `upIsGood` is false for the sales cycle — a SHORTER cycle is an improvement,
 * so a fall renders green. Getting this backwards paints every improvement red,
 * which is the single easiest mistake on a metrics screen.
 */
export function trendTone(value: number, upIsGood: boolean): 'good' | 'bad' {
  return value >= 0 === upIsGood ? 'good' : 'bad';
}

/** dd MMM yyyy, the form the design uses for the "as of today" chip. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The month so far — the first of the month up to and including today.
 *
 * NOT the whole calendar month, which is what the API falls back to when given
 * no dates. Ending at month-end draws a week of empty future days on the cash
 * flow chart and makes the label ("1–22 Aug") disagree with the window it
 * describes. Ending at today keeps the two honest about each other.
 */
export function currentMonthRange(now: Date): { from: string; to: string; label: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const monthName = now.toLocaleDateString('en-IN', { month: 'short' });
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(day)}`,
    label: `1–${day} ${monthName} ${year}`,
  };
}
