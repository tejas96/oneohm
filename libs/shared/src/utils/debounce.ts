export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

export const DEFAULT_SEARCH_DEBOUNCE_MS = 600;
export const DEFAULT_API_DEBOUNCE_MS = 500;

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = DEFAULT_SEARCH_DEBOUNCE_MS,
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }
  };

  return debounced;
}

export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay: number = DEFAULT_SEARCH_DEBOUNCE_MS,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestResolve: ((value: Awaited<ReturnType<T>> | undefined) => void) | null = null;

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> =>
    new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        if (latestResolve) {
          latestResolve(undefined);
        }
      }

      latestResolve = resolve;

      timeoutId = setTimeout(async () => {
        timeoutId = null;
        const result = await fn(...args);
        resolve(result as Awaited<ReturnType<T>>);
      }, delay);
    });
}
