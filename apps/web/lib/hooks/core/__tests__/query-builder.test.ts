import { buildQueryParams } from '../query-builder';
import type { BaseFilters } from '../types';

interface TestFilters extends BaseFilters {
  status?: string;
  internal?: string;
}

describe('buildQueryParams', () => {
  it('converts filter object to URLSearchParams', () => {
    const params = buildQueryParams({ page: 1, limit: 10, sortBy: 'name' });
    expect(params.get('page')).toBe('1');
    expect(params.get('limit')).toBe('10');
    expect(params.get('sortBy')).toBe('name');
  });

  it('skips undefined, null, and empty string values', () => {
    const params = buildQueryParams<TestFilters>({
      page: 1,
      search: undefined,
      sortBy: null as unknown as string,
      sortOrder: '' as 'ASC',
    });
    expect(params.get('page')).toBe('1');
    expect(params.has('search')).toBe(false);
    expect(params.has('sortBy')).toBe(false);
    expect(params.has('sortOrder')).toBe(false);
  });

  it('skips "all" values by default', () => {
    const params = buildQueryParams<TestFilters>({ status: 'all', page: 1 });
    expect(params.has('status')).toBe(false);
    expect(params.get('page')).toBe('1');
  });

  it('skips search shorter than minSearchLength', () => {
    const params = buildQueryParams({ search: 'a' }, { minSearchLength: 2 });
    expect(params.has('search')).toBe(false);

    const params2 = buildQueryParams({ search: 'ab' }, { minSearchLength: 2 });
    expect(params2.get('search')).toBe('ab');
  });

  it('uses default minSearchLength of 2', () => {
    const params = buildQueryParams({ search: 'a' });
    expect(params.has('search')).toBe(false);

    const params2 = buildQueryParams({ search: 'ab' });
    expect(params2.get('search')).toBe('ab');
  });

  it('respects skipKeys option', () => {
    const params = buildQueryParams<TestFilters>(
      { page: 1, internal: 'data' },
      { skipKeys: ['internal'] },
    );
    expect(params.has('internal')).toBe(false);
    expect(params.get('page')).toBe('1');
  });

  it('respects custom skipValues', () => {
    const params = buildQueryParams<TestFilters>(
      { status: 'none' },
      { skipValues: ['none', 'all'] },
    );
    expect(params.has('status')).toBe(false);
  });
});
