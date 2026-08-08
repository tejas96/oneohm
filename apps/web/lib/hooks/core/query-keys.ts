export type ResourceKeys = ReturnType<typeof createResourceKeys>;

export function stableHash(obj: unknown): string {
  if (obj === undefined || obj === null) return '';
  if (typeof obj !== 'object') return `${obj as string | number | boolean}`;
  if (Array.isArray(obj)) return `[${obj.map(stableHash).join(',')}]`;

  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = stableHash(value);
      }
      return acc;
    }, {});

  return `{${Object.entries(sorted)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')}}`;
}

export function createResourceKeys(resource: string): {
  all: () => readonly [string];
  lists: () => readonly [string, 'list'];
  list: (filters: Record<string, unknown>) => readonly [string, 'list', string];
  details: () => readonly [string, 'detail'];
  detail: (id: string) => readonly [string, 'detail', string];
  stats: () => readonly [string, 'stats'];
  infinite: (filters: Record<string, unknown>) => readonly [string, 'infinite', string];
} {
  return {
    all: () => [resource] as const,
    lists: () => [resource, 'list'] as const,
    list: (filters: Record<string, unknown>) => [resource, 'list', stableHash(filters)] as const,
    details: () => [resource, 'detail'] as const,
    detail: (id: string) => [resource, 'detail', id] as const,
    stats: () => [resource, 'stats'] as const,
    infinite: (filters: Record<string, unknown>) =>
      [resource, 'infinite', stableHash(filters)] as const,
  };
}
