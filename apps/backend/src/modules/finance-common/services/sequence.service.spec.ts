/**
 * SequenceService unit tests.
 *
 * These pin the ON CONFLICT target. When `organization_id` was dropped, the
 * unique index behind this upsert became `(sequence_key)` alone — and an
 * ON CONFLICT target that does not match a unique index does not degrade
 * gracefully: it throws at runtime, on the call that issues a customer's
 * receipt number. Asserting the emitted SQL is the cheapest way to keep the
 * statement and the index in step, since neither the compiler nor a type can.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { FinanceSequenceScope } from '@tejas96/shared/types';
import type { DataSource } from 'typeorm';

import { SequenceService } from './sequence.service';

interface Recorded {
  sql: string;
  params: unknown[];
}

describe('SequenceService.getNextNumber', () => {
  let recorded: Recorded[];
  let service: SequenceService;

  beforeEach(() => {
    recorded = [];
    const manager = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        recorded.push({ sql, params });
        return [{ last_value: 7 }];
      }),
    };
    service = new SequenceService({ manager } as unknown as DataSource);
  });

  it('conflicts on sequence_key alone — the index no longer includes organization_id', async () => {
    await service.getNextNumber(FinanceSequenceScope.RECEIPT);

    expect(recorded[0]?.sql).toContain('ON CONFLICT (sequence_key)');
    expect(recorded[0]?.sql).not.toContain('organization_id');
  });

  it('passes only the sequence key as a parameter', async () => {
    await service.getNextNumber(FinanceSequenceScope.RECEIPT);

    expect(recorded[0]?.params).toHaveLength(1);
    expect(String(recorded[0]?.params[0])).toMatch(/^receipt-\d{4}-\d{2}$/);
  });

  it('formats the number with the scope prefix, financial year and zero padding', async () => {
    const result = await service.getNextNumber(FinanceSequenceScope.RECEIPT);

    expect(result).toMatch(/^RCP-\d{4}-\d{2}-000007$/);
  });

  it('uses the expense prefix for the expense scope', async () => {
    const result = await service.getNextNumber(FinanceSequenceScope.EXPENSE);

    expect(result).toMatch(/^EXP-\d{4}-\d{2}-000007$/);
  });

  it('participates in an outer transaction when one is passed', async () => {
    const outer: Recorded[] = [];
    const manager = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        outer.push({ sql, params });
        return [{ last_value: 1 }];
      }),
    };

    await service.getNextNumber(FinanceSequenceScope.RECEIPT, manager as never);

    expect(outer).toHaveLength(1);
    expect(recorded).toHaveLength(0);
  });
});
