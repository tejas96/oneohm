import { defaultResponseAdapter } from '../response-adapter';

describe('defaultResponseAdapter', () => {
  it('handles Format A: { data, meta }', () => {
    const raw = {
      data: [{ id: '1', name: 'Test' }],
      meta: { page: 1, limit: 10, total: 50, totalPages: 5 },
    };
    const result = defaultResponseAdapter(raw);
    expect(result.data).toEqual([{ id: '1', name: 'Test' }]);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 50, totalPages: 5 });
  });

  it('handles Format B: { items, total, page, limit }', () => {
    const raw = {
      items: [{ id: '1' }, { id: '2' }],
      total: 20,
      page: 2,
      limit: 10,
    };
    const result = defaultResponseAdapter(raw);
    expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 20, totalPages: 2 });
  });

  it('handles Format C: { data, total, page, pageSize }', () => {
    const raw = {
      data: [{ id: '1' }],
      total: 30,
      page: 1,
      pageSize: 15,
    };
    const result = defaultResponseAdapter(raw);
    expect(result.data).toEqual([{ id: '1' }]);
    expect(result.meta).toEqual({ page: 1, limit: 15, total: 30, totalPages: 2 });
  });

  it('computes totalPages correctly with rounding', () => {
    const raw = { items: [], total: 11, page: 1, limit: 10 };
    const result = defaultResponseAdapter(raw);
    expect(result.meta.totalPages).toBe(2);
  });

  it('handles zero total gracefully', () => {
    const raw = { items: [], total: 0, page: 1, limit: 10 };
    const result = defaultResponseAdapter(raw);
    expect(result.meta.totalPages).toBe(1);
    expect(result.data).toEqual([]);
  });

  it('throws for unknown response format', () => {
    expect(() => defaultResponseAdapter({ unknown: true })).toThrow('Unknown API response format');
  });
});
