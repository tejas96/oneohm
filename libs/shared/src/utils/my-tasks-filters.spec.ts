import { escapeIlikePattern, matchesMyTaskAddressFilter } from './my-tasks-filters';

describe('escapeIlikePattern', () => {
  it('escapes SQL ILIKE wildcards', () => {
    expect(escapeIlikePattern('100%_')).toBe('100\\%\\_');
  });
});

describe('matchesMyTaskAddressFilter', () => {
  it('matches city substring', () => {
    expect(matchesMyTaskAddressFilter({ city: 'Sangli', address: 'Main road' }, 'sang')).toBe(true);
  });

  it('returns false when no property fields match', () => {
    expect(matchesMyTaskAddressFilter({ city: 'Pune' }, 'Sangli')).toBe(false);
  });

  it('treats percent as literal in in-memory filter', () => {
    expect(matchesMyTaskAddressFilter({ city: '100% off' }, '100%')).toBe(true);
  });
});
