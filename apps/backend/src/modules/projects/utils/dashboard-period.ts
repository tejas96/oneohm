import { BadRequestException } from '@nestjs/common';
import type { DashboardPeriod, DashboardRange } from '@tejas96/shared/types';

/**
 * Dashboard periods as IST calendar days. Everything works on `YYYY-MM-DD`
 * strings and UTC-midnight Dates, so the host clock's zone never moves a day.
 * Quarters and years are Indian financial ones (Apr–Mar).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;
const MAX_CUSTOM_DAYS = 1096; // 3 years

export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const parse = (iso: string): Date => {
  const [y = NaN, m = NaN, d = NaN] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date): string => d.toISOString().slice(0, 10);
const monthStart = (y: number, m: number): Date => new Date(Date.UTC(y, m, 1));
const monthEnd = (y: number, m: number): Date => new Date(Date.UTC(y, m + 1, 0));
const days = (a: Date, b: Date): number => Math.round((b.getTime() - a.getTime()) / DAY_MS);
const dayMonth = (d: Date): string => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export function addDaysIso(iso: string, n: number): string {
  return fmt(new Date(parse(iso).getTime() + n * DAY_MS));
}

function spanLabel(from: Date, to: Date): string {
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${dayMonth(from)} ${String(from.getUTCFullYear()).slice(2)} – ${dayMonth(to)} ${String(to.getUTCFullYear()).slice(2)}`;
  }
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.getUTCDate()}–${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]}`;
  }
  return `${dayMonth(from)} – ${dayMonth(to)}`;
}

export function resolveDashboardRange(
  period: DashboardPeriod,
  customFrom: string | undefined,
  customTo: string | undefined,
  todayIso: string,
): DashboardRange {
  const today = parse(todayIso);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;
  let label: string;
  let prevLabel: string;

  switch (period) {
    case 'last_month': {
      from = monthStart(y, m - 1);
      to = monthEnd(y, m - 1);
      prevFrom = monthStart(y, m - 2);
      prevTo = monthEnd(y, m - 2);
      label = MONTHS[from.getUTCMonth()] ?? '';
      prevLabel = MONTHS[prevFrom.getUTCMonth()] ?? '';
      break;
    }
    case 'this_quarter': {
      const qStart = m - ((m + 9) % 3); // Apr, Jul, Oct, Jan
      from = monthStart(y, qStart);
      to = monthEnd(y, qStart + 2);
      prevFrom = monthStart(y, qStart - 3);
      prevTo = monthEnd(y, qStart - 1);
      label = `${MONTHS[from.getUTCMonth()]}–${MONTHS[to.getUTCMonth()]}`;
      prevLabel = `${MONTHS[prevFrom.getUTCMonth()]}–${MONTHS[prevTo.getUTCMonth()]}`;
      break;
    }
    case 'this_fy': {
      const fy = m >= 3 ? y : y - 1;
      from = new Date(Date.UTC(fy, 3, 1));
      to = new Date(Date.UTC(fy + 1, 2, 31));
      prevFrom = new Date(Date.UTC(fy - 1, 3, 1));
      prevTo = new Date(Date.UTC(fy, 2, 31));
      label = `FY ${String(fy).slice(2)}-${String(fy + 1).slice(2)}`;
      prevLabel = `FY ${String(fy - 1).slice(2)}-${String(fy).slice(2)}`;
      break;
    }
    case 'custom': {
      if (!customFrom || !customTo) {
        throw new BadRequestException('A custom period needs both from and to');
      }
      from = parse(customFrom);
      to = parse(customTo);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new BadRequestException('from and to must be YYYY-MM-DD dates');
      }
      if (to < from) throw new BadRequestException('to cannot be before from');
      if (days(from, to) + 1 > MAX_CUSTOM_DAYS) {
        throw new BadRequestException('A custom period can be at most 3 years');
      }
      const length = days(from, to) + 1;
      prevTo = new Date(from.getTime() - DAY_MS);
      prevFrom = new Date(prevTo.getTime() - (length - 1) * DAY_MS);
      label = spanLabel(from, to);
      prevLabel = spanLabel(prevFrom, prevTo);
      break;
    }
    case 'this_month':
    default: {
      from = monthStart(y, m);
      to = monthEnd(y, m);
      prevFrom = monthStart(y, m - 1);
      prevTo = monthEnd(y, m - 1);
      label = MONTHS[m] ?? '';
      prevLabel = MONTHS[prevFrom.getUTCMonth()] ?? '';
    }
  }

  // A half-done period is compared with the same number of days before it.
  if (today >= from && today <= to) {
    const cut = new Date(prevFrom.getTime() + days(from, today) * DAY_MS);
    if (cut < prevTo) {
      prevTo = cut;
      prevLabel = spanLabel(prevFrom, prevTo);
    }
  }

  return {
    from: fmt(from),
    to: fmt(to),
    previousFrom: fmt(prevFrom),
    previousTo: fmt(prevTo),
    label,
    previousLabel: prevLabel,
  };
}
