import type { BaseFilters } from './types';

export interface QueryBuildOptions {
  minSearchLength?: number;
  skipKeys?: string[];
  skipValues?: Array<string | number>;
  paramMapping?: Record<string, string>;
}

export function buildQueryParams<F extends BaseFilters>(
  filters: F,
  options?: QueryBuildOptions,
): URLSearchParams {
  const params = new URLSearchParams();
  const minSearch = options?.minSearchLength ?? 2;
  const skipKeys = new Set(options?.skipKeys ?? []);
  const skipValues = new Set<string | number>(options?.skipValues ?? ['all']);

  for (const [key, value] of Object.entries(filters)) {
    if (skipKeys.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    if (skipValues.has(value as string | number)) continue;
    if (key === 'search' && typeof value === 'string' && value.length < minSearch) continue;
    params.set(key, `${value as string | number | boolean}`);
  }

  if (options?.paramMapping) {
    for (const [from, to] of Object.entries(options.paramMapping)) {
      if (params.has(from)) {
        params.set(to, params.get(from)!);
        params.delete(from);
      }
    }
  }

  return params;
}
