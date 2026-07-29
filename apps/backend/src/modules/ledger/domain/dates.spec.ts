import { describe, expect, it } from '@jest/globals';

import { financialYearOf, pgDateToIso, toIsoDate } from './dates';

describe('pgDateToIso', () => {
  /**
   * REGRESSION. This shipped briefly and shifted every customer-facing payment
   * date back by one day.
   *
   * node-postgres hydrates a `date` column as a JS Date at LOCAL midnight. In
   * IST (UTC+5:30) `new Date(2026, 4, 6).toISOString()` is
   * `2026-05-05T18:30:00.000Z` — so slicing the ISO string yields 2026-05-05 for
   * a row whose value_date is 2026-05-06.
   */
  it('reads a local-midnight Date without shifting the day', () => {
    const pgValue = new Date(2026, 4, 6); // 6 May 2026, local midnight
    expect(pgDateToIso(pgValue)).toBe('2026-05-06');

    // the wrong implementation, pinned so nobody reintroduces it
    if (pgValue.getTimezoneOffset() < 0) {
      // only true east of UTC, e.g. IST
      expect(pgValue.toISOString().slice(0, 10)).toBe('2026-05-05');
    }
  });

  it('handles every day of a month without drift', () => {
    for (let day = 1; day <= 28; day++) {
      const d = new Date(2026, 0, day);
      expect(pgDateToIso(d)).toBe(`2026-01-${String(day).padStart(2, '0')}`);
    }
  });

  it('handles year and month boundaries', () => {
    expect(pgDateToIso(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(pgDateToIso(new Date(2025, 11, 31))).toBe('2025-12-31');
    expect(pgDateToIso(new Date(2028, 1, 29))).toBe('2028-02-29'); // leap day
  });

  it('passes strings through untouched', () => {
    expect(pgDateToIso('2026-05-06')).toBe('2026-05-06');
    expect(pgDateToIso('2026-05-06T11:22:33.000Z')).toBe('2026-05-06');
  });
});

describe('toIsoDate', () => {
  it('trims a datetime to a date', () => {
    expect(toIsoDate('2026-07-15T18:45:00.000Z')).toBe('2026-07-15');
    expect(toIsoDate('2026-07-15')).toBe('2026-07-15');
  });
});

describe('financialYearOf', () => {
  it.each([
    ['2026-04-01', '2026-27'],
    ['2026-12-31', '2026-27'],
    ['2027-03-31', '2026-27'],
    ['2027-04-01', '2027-28'],
    ['2026-01-15', '2025-26'],
    ['2026-03-31', '2025-26'],
  ])('%s falls in FY %s', (date, fy) => {
    expect(financialYearOf(date)).toBe(fy);
  });

  /**
   * The existing SequenceService computes FY from the current UTC instant. At
   * 31 March 20:00 IST that instant is still 31 March in UTC — but a receipt
   * dated 1 April IST belongs to the NEXT financial year. Deriving FY from the
   * entry's own value date removes the ambiguity entirely.
   */
  it('follows the value date across the FY boundary, not the clock', () => {
    expect(financialYearOf('2027-03-31')).toBe('2026-27');
    expect(financialYearOf('2027-04-01')).toBe('2027-28');
  });
});
