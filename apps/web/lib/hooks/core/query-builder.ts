import type { BaseFilters } from './types';

export interface QueryBuildOptions {
  minSearchLength?: number;
  skipKeys?: string[];
  skipValues?: Array<string | number>;
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
    params.set(key, String(value));
  }
  return params;
}
