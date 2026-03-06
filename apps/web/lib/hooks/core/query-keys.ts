export function stableHash(obj: unknown): string {
  if (obj === undefined || obj === null) return '';
  if (typeof obj !== 'object') return `${obj as string | number | boolean}`;
  if (Array.isArray(obj)) return JSON.stringify(obj.map(stableHash));

  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== '') {
        acc[key] =
          typeof value === 'object' && value !== null ? JSON.parse(stableHash(value)) : value;
      }
      return acc;
    }, {});

  return JSON.stringify(sorted);
}

export function createResourceKeys(resource: string) {
  return {
    all: (orgId?: string) => [resource, orgId] as const,
    lists: (orgId?: string) => [resource, orgId, 'list'] as const,
    list: (orgId: string | undefined, filters: Record<string, unknown>) =>
      [resource, orgId, 'list', stableHash(filters)] as const,
    details: (orgId?: string) => [resource, orgId, 'detail'] as const,
    detail: (orgId: string | undefined, id: string) => [resource, orgId, 'detail', id] as const,
    stats: (orgId?: string) => [resource, orgId, 'stats'] as const,
    infinite: (orgId: string | undefined, filters: Record<string, unknown>) =>
      [resource, orgId, 'infinite', stableHash(filters)] as const,
  };
}
