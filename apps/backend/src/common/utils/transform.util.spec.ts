import { systemSizeKwOf, systemSizeKwSql } from './transform.util';

describe('systemSizeKwOf', () => {
  it('prefers the modules actually selected over the quoted figure', () => {
    // Six 570 Wp panels against a 3 kW quote — the real case this exists for.
    expect(systemSizeKwOf({ totalWattageWp: 3420, systemSizeKw: 3 })).toBe(3.42);
  });

  it('falls back to the quoted figure when no wattage is recorded', () => {
    expect(systemSizeKwOf({ totalWattageWp: null, systemSizeKw: 3 })).toBe(3);
    expect(systemSizeKwOf({ systemSizeKw: 5.5 })).toBe(5.5);
  });

  it('treats a zero wattage as absent rather than as a 0 kW system', () => {
    expect(systemSizeKwOf({ totalWattageWp: 0, systemSizeKw: 4 })).toBe(4);
  });

  it('reads numeric columns that arrive as strings', () => {
    // Postgres `numeric` comes back as a string through the driver.
    expect(systemSizeKwOf({ totalWattageWp: '3420', systemSizeKw: '3.00' })).toBe(3.42);
  });

  it('rounds to two places rather than trailing float noise', () => {
    expect(systemSizeKwOf({ totalWattageWp: 3245 })).toBe(3.25);
  });

  it('is undefined when the version carries neither', () => {
    expect(systemSizeKwOf({})).toBeUndefined();
  });
});

describe('systemSizeKwSql', () => {
  it('applies the same preference in SQL, for ORDER BY and WHERE', () => {
    expect(systemSizeKwSql('cv')).toBe(
      'CASE WHEN cv.totalWattageWp > 0 THEN cv.totalWattageWp / 1000.0 ELSE cv.systemSizeKw END',
    );
  });
});
