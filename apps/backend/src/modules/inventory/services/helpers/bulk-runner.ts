import { Logger } from '@nestjs/common';

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

const log = new Logger('BulkRunner');

/**
 * Runs `operation` against each id sequentially (NOT in a single transaction)
 * so a hard failure on one id does not roll back the others. Each id gets its
 * own try/catch; the result aggregates successes and failures.
 *
 * Sequential is intentional:
 *   - parallel bulk cancels would race for pessimistic row locks on the same
 *     warehouse stock row in adversarial cases (e.g. cancelling 5 allocations
 *     for the same SKU) and the current single-record cancel paths already
 *     hold those locks.
 *   - the response shape is what the frontend needs for partial-failure UX
 *     ("3 cancelled, 1 failed: PO-202604-0007 — already received") and matches
 *     the plan's adversarial-review decision.
 */
export async function runBulk(
  ids: string[],
  operation: (id: string) => Promise<unknown>,
  context: string,
): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    try {
      await operation(id);
      result.succeeded.push(id);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      result.failed.push({ id, reason });
      log.warn(`[${context}] id=${id} failed: ${reason}`);
    }
  }
  return result;
}
