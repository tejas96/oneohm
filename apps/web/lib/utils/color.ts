/**
 * Deterministically map a string seed to an index in [0, size).
 * Same seed and size always produce the same index.
 */
export function deterministicIndex(seed: string, size: number): number {
  if (!seed || size <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

/**
 * Pick a deterministic item from a pool based on a string seed.
 */
export function pickDeterministic<T>(seed: string, pool: readonly T[], fallback: T): T {
  if (pool.length === 0) return fallback;
  return pool[deterministicIndex(seed, pool.length)] ?? fallback;
}
