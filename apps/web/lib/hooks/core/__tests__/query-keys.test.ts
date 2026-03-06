import { stableHash, createResourceKeys } from '../query-keys';

describe('stableHash', () => {
  it('returns empty string for null and undefined', () => {
    expect(stableHash(null)).toBe('');
    expect(stableHash(undefined)).toBe('');
  });

  it('returns string representation for primitives', () => {
    expect(stableHash(42)).toBe('42');
    expect(stableHash('hello')).toBe('hello');
    expect(stableHash(true)).toBe('true');
  });

  it('produces same hash regardless of key order', () => {
    const a = stableHash({ b: 2, a: 1 });
    const b = stableHash({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it('strips undefined, null, and empty string values', () => {
    const hash = stableHash({ a: 1, b: undefined, c: null, d: '' });
    expect(hash).toBe(JSON.stringify({ a: 1 }));
  });

  it('preserves zero and false values', () => {
    const hash = stableHash({ a: 0, b: false });
    expect(hash).toBe(JSON.stringify({ a: 0, b: false }));
  });

  it('produces deterministic output for nested objects', () => {
    const a = stableHash({ filters: { status: 'active' }, page: 1 });
    const b = stableHash({ page: 1, filters: { status: 'active' } });
    expect(a).toBe(b);
  });

  it('produces same hash for nested objects with different key order', () => {
    const a = stableHash({ filters: { z: 3, a: 1, m: 2 } });
    const b = stableHash({ filters: { a: 1, m: 2, z: 3 } });
    expect(a).toBe(b);
  });

  it('handles arrays', () => {
    const hash = stableHash([1, 'two', null]);
    expect(hash).toBe(JSON.stringify(['1', 'two', '']));
  });
});

describe('createResourceKeys', () => {
  const keys = createResourceKeys('customers');

  it('creates correct all key', () => {
    expect(keys.all('org-1')).toEqual(['customers', 'org-1']);
  });

  it('creates correct lists key', () => {
    expect(keys.lists('org-1')).toEqual(['customers', 'org-1', 'list']);
  });

  it('creates correct list key with stable filter hash', () => {
    const key1 = keys.list('org-1', { page: 1, status: 'active' });
    const key2 = keys.list('org-1', { status: 'active', page: 1 });
    expect(key1).toEqual(key2);
  });

  it('creates correct detail key', () => {
    expect(keys.detail('org-1', 'user-123')).toEqual(['customers', 'org-1', 'detail', 'user-123']);
  });

  it('creates correct stats key', () => {
    expect(keys.stats('org-1')).toEqual(['customers', 'org-1', 'stats']);
  });

  it('creates correct infinite key', () => {
    const key = keys.infinite('org-1', { page: 1 });
    expect(key[0]).toBe('customers');
    expect(key[1]).toBe('org-1');
    expect(key[2]).toBe('infinite');
    expect(typeof key[3]).toBe('string');
  });

  it('handles undefined orgId', () => {
    expect(keys.all(undefined)).toEqual(['customers', undefined]);
    expect(keys.lists(undefined)).toEqual(['customers', undefined, 'list']);
  });
});
