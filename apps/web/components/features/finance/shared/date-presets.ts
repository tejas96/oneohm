import type { FyPreset } from '../constants';

/**
 * Resolve a FY-aware preset into an inclusive [from, to] YYYY-MM-DD pair.
 * Indian Financial Year runs April–March. Returns null for `custom`
 * (caller is expected to source from/to from explicit MUIDatePicker
 * inputs in that case).
 *
 * `now` is injectable for unit testing — defaults to current local date.
 */
export function resolveFyPresetRange(
  preset: FyPreset,
  now: Date = new Date(),
): { from: string; to: string } | null {
  if (preset === 'custom') return null;

  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  switch (preset) {
    case 'this-month':
      return { from: ymd(y, m, 1), to: ymd(y, m + 1, 0) };

    case 'last-month': {
      // Going to month -1 with day 1 is safe; JS handles year rollover.
      const lastM = m - 1;
      return { from: ymd(y, lastM, 1), to: ymd(y, lastM + 1, 0) };
    }

    case 'this-quarter': {
      const qStartMonth = Math.floor(m / 3) * 3;
      return { from: ymd(y, qStartMonth, 1), to: ymd(y, qStartMonth + 3, 0) };
    }

    case 'this-fy': {
      // FY starts April (month index 3). If we're in Jan-Mar, FY started last year.
      const fyStartYear = m >= 3 ? y : y - 1;
      return { from: ymd(fyStartYear, 3, 1), to: ymd(fyStartYear + 1, 2, 31) };
    }

    case 'last-fy': {
      const fyStartYear = m >= 3 ? y - 1 : y - 2;
      return { from: ymd(fyStartYear, 3, 1), to: ymd(fyStartYear + 1, 2, 31) };
    }

    default:
      return null;
  }
}

/**
 * Format (year, monthIndex, day) as YYYY-MM-DD using local time.
 * Day 0 of "next month" = last day of current month, which we exploit
 * for end-of-month / end-of-quarter calculations.
 */
function ymd(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Inverse-ish: given an explicit {from, to}, return the matching preset
 * name if any, otherwise 'custom'. Used to keep the preset chip
 * highlighted when the URL state is rehydrated from query params.
 */
export function detectPreset(from?: string, to?: string, now: Date = new Date()): FyPreset {
  if (!from || !to) return 'custom';
  for (const preset of [
    'this-month',
    'last-month',
    'this-quarter',
    'this-fy',
    'last-fy',
  ] as const) {
    const r = resolveFyPresetRange(preset, now);
    if (r?.from === from && r.to === to) return preset;
  }
  return 'custom';
}
