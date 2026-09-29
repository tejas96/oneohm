/**
 * Cost and margin never reach a reseller's phone (spec §7.3). Applied to
 * EVERY reseller response by the interceptor, so a field added to a DTO
 * later is covered by name, not by someone remembering this route.
 */
const HIDDEN_KEYS = new Set([
  'profitabilityAmount',
  'profitabilityPercent',
  'marginPercent',
  'profitMarginTiers',
  'actualCost',
  'costMultiplier',
]);

/** His own record carries these; he sees the last four only. */
const MASKED_KEYS = new Set(['accountNumber', 'aadhaarNumber']);

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (MASKED_KEYS.has(key) && typeof v === 'string' && v.length > 0) {
      out[key] = `••••${v.slice(-4)}`;
      continue;
    }
    out[key] = walk(v);
  }
  return out;
}

export function redactForReseller<T>(body: T): T {
  if (body === null || body === undefined || typeof body !== 'object') return body;
  if (Buffer.isBuffer(body) || typeof (body as { pipe?: unknown }).pipe === 'function') return body;
  // JSON round trip first: it applies toJSON (Dates, class instances) exactly
  // as Express would, so what we redact IS what would have been sent.
  return walk(JSON.parse(JSON.stringify(body))) as T;
}
