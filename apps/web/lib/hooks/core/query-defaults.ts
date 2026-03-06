export const RESOURCE_QUERY_DEFAULTS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export const RESOURCE_QUERY_RETRY = (failureCount: number, error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const RESOURCE_MUTATION_DEFAULTS = {
  retry: (failureCount: number, error: unknown) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status && status >= 400 && status < 500) return false;
    return failureCount < 1;
  },
} as const;

export const STALE_TIMES = {
  realtime: 0,
  fast: 15_000,
  standard: 60_000,
  slow: 5 * 60_000,
  static: 30 * 60_000,
} as const;
