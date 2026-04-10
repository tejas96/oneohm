/**
 * Deterministically map a string seed to an index in [0, size).
 *
 * Uses the djb2 hash algorithm (better bit avalanche than the simple
 * polynomial hash — reduces clustering on similar string prefixes).
 * Same seed and size always produce the same index.
 */
export function deterministicIndex(seed: string, size: number): number {
  if (!seed || size <= 0) return 0;
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    // djb2: hash * 33 + charCode  (>>> 0 keeps it 32-bit unsigned)
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
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

/**
 * MUI avatar color pairs — background uses a muted alpha tint of the palette
 * color so it reads well at small sizes; text uses the saturated main value.
 * All values are valid MUI sx `bgcolor` / `color` theme tokens.
 */
const MUI_AVATAR_COLOR_POOL = [
  { bgcolor: 'rgba(118,192,68,0.15)', color: '#4d7c0f' }, // primary green
  { bgcolor: 'rgba(13,116,184,0.15)', color: '#0a5c92' }, // secondary blue
  { bgcolor: 'rgba(14,165,233,0.15)', color: '#0369a1' }, // info sky
  { bgcolor: 'rgba(34,197,94,0.15)', color: '#15803d' }, // success green
  { bgcolor: 'rgba(234,179,8,0.15)', color: '#a16207' }, // warning amber
  { bgcolor: 'rgba(220,38,38,0.15)', color: '#dc2626' }, // error red
  { bgcolor: 'rgba(139,92,246,0.15)', color: '#6d28d9' }, // violet
  { bgcolor: 'rgba(236,72,153,0.15)', color: '#be185d' }, // pink
  { bgcolor: 'rgba(20,184,166,0.15)', color: '#0f766e' }, // teal
  { bgcolor: 'rgba(249,115,22,0.15)', color: '#c2410c' }, // orange
] as const;

/**
 * Return deterministic MUI sx-compatible bgcolor + color for an avatar.
 * Same name always produces the same color pair.
 */
export function getMuiAvatarColors(seed: string): { bgcolor: string; color: string } {
  return pickDeterministic(seed, MUI_AVATAR_COLOR_POOL, MUI_AVATAR_COLOR_POOL[0]);
}
