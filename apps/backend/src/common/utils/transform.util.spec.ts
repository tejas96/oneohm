import { systemSizeKwOf, systemSizeKwSql, systemSizeKwSqlRaw, wattsToKw } from './transform.util';

describe('wattsToKw', () => {
  it('converts wattage to kW rounded to two places', () => {
    expect(wattsToKw(3420)).toBe(3.42);
    expect(wattsToKw(3245)).toBe(3.25);
  });

  it('reads numeric columns that arrive as strings', () => {
    expect(wattsToKw('3420')).toBe(3.42);
  });

  it('returns undefined for zero, null, or missing wattage', () => {
    expect(wattsToKw(0)).toBeUndefined();
    expect(wattsToKw(null)).toBeUndefined();
    expect(wattsToKw(undefined)).toBeUndefined();
  });
});

describe('systemSizeKwOf', () => {
  it('derives kW from totalWattageWp only', () => {
    expect(systemSizeKwOf({ totalWattageWp: 3420 })).toBe(3.42);
  });

  it('is undefined when wattage is absent or zero', () => {
    expect(systemSizeKwOf({ totalWattageWp: 0 })).toBeUndefined();
    expect(systemSizeKwOf({})).toBeUndefined();
  });
});

describe('systemSizeKwSql', () => {
  it('derives kW from wattage only in SQL', () => {
    expect(systemSizeKwSql('cv')).toBe(
      'CASE WHEN cv.totalWattageWp > 0 THEN ROUND((cv.totalWattageWp / 1000.0)::numeric, 2) ELSE NULL END',
    );
  });
});

describe('systemSizeKwSqlRaw', () => {
  it('derives kW from total_wattage_wp in raw SQL', () => {
    expect(systemSizeKwSqlRaw('cv')).toBe(
      'CASE WHEN cv.total_wattage_wp > 0 THEN ROUND((cv.total_wattage_wp / 1000.0)::numeric, 2) ELSE NULL END',
    );
  });
});
