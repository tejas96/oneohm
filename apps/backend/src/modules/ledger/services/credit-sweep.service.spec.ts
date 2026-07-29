import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LedgerAllocationEntity } from '../entities';
import { CreditSweepService } from './credit-sweep.service';
import { LedgerRepository } from '../repositories/ledger.repository';

const PROJECT = 'project-1';
const USER = 'user-1';

/** Captures the allocation rows so the tests assert on data, not on mocks. */
interface Captured {
  allocations: Array<Array<Record<string, unknown>>>;
}

describe('CreditSweepService', () => {
  let service: CreditSweepService;
  let captured: Captured;

  beforeEach(async () => {
    captured = { allocations: [] };
    const module = await Test.createTestingModule({
      providers: [
        CreditSweepService,
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
        { provide: LedgerRepository, useValue: {} },
      ],
    }).compile();
    service = module.get(CreditSweepService);
  });

  describe('sweepCreditOntoMilestone', () => {
    /**
     * The sweep runs on the caller's manager and issues two raw statements: a
     * lock, then a remainder read. `queries` records both so the ordering — the
     * property that keeps two concurrent sweeps from spending the same credit —
     * is asserted rather than assumed.
     */
    const makeSweepManager = (
      remainders: Array<{ entryId: string; remainderPaise: string | number }>,
      captured: Captured,
      queries: string[],
    ): any => ({
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        return sql.includes('FOR UPDATE') ? [] : remainders;
      }),
      getRepository: (entity: unknown) => {
        if (entity === LedgerAllocationEntity) {
          return {
            insert: jest.fn(async (rows: any[]) => {
              captured.allocations.push(rows);
              return { identifiers: [] };
            }),
          };
        }
        throw new Error('unexpected repository');
      },
    });

    it('takes the lock before reading remainders', async () => {
      const queries: string[] = [];
      const manager = makeSweepManager([{ entryId: 'e1', remainderPaise: 500 }], captured, queries);

      await service.sweepCreditOntoMilestone(manager, PROJECT, 'm-new', 500, USER);

      expect(queries).toHaveLength(2);
      expect(queries[0]).toContain('FOR UPDATE');
      expect(queries[1]).not.toContain('FOR UPDATE');
    });

    it('never allocates more than the milestone can absorb', async () => {
      const queries: string[] = [];
      // 1,00,000 paise of credit available against a 40,000 paise milestone.
      const manager = makeSweepManager(
        [{ entryId: 'e1', remainderPaise: 100_000 }],
        captured,
        queries,
      );

      const applied = await service.sweepCreditOntoMilestone(
        manager,
        PROJECT,
        'm-new',
        40_000,
        USER,
      );

      expect(applied).toBe(40_000);
      expect(captured.allocations[0]).toEqual([
        expect.objectContaining({ entryId: 'e1', milestoneId: 'm-new', amountPaise: 40_000 }),
      ]);
    });

    it('draws FIFO across entries and stops once the milestone is covered', async () => {
      const queries: string[] = [];
      const manager = makeSweepManager(
        [
          { entryId: 'e1', remainderPaise: 300 },
          { entryId: 'e2', remainderPaise: 900 },
          { entryId: 'e3', remainderPaise: 500 },
        ],
        captured,
        queries,
      );

      const applied = await service.sweepCreditOntoMilestone(manager, PROJECT, 'm-new', 1000, USER);

      expect(applied).toBe(1000);
      // e1 fully, e2 partially, e3 untouched.
      expect(captured.allocations[0]).toEqual([
        expect.objectContaining({ entryId: 'e1', amountPaise: 300 }),
        expect.objectContaining({ entryId: 'e2', amountPaise: 700 }),
      ]);
    });

    it('coerces string paise from the raw query instead of concatenating them', async () => {
      const queries: string[] = [];
      // node-postgres hands BIGINT back as a string; `+` on those silently
      // concatenates, which is the class of bug this rebuild exists to remove.
      const manager = makeSweepManager(
        [
          { entryId: 'e1', remainderPaise: '300' },
          { entryId: 'e2', remainderPaise: '900' },
        ],
        captured,
        queries,
      );

      const applied = await service.sweepCreditOntoMilestone(manager, PROJECT, 'm-new', 1000, USER);

      expect(applied).toBe(1000);
      expect(typeof captured.allocations[0]![0]!.amountPaise).toBe('number');
    });

    it('marks swept allocations inferred — nobody chose them, the waterfall did', async () => {
      const queries: string[] = [];
      const manager = makeSweepManager([{ entryId: 'e1', remainderPaise: 500 }], captured, queries);

      await service.sweepCreditOntoMilestone(manager, PROJECT, 'm-new', 500, USER);

      expect(captured.allocations[0]![0]).toMatchObject({ isInferred: true, createdBy: USER });
    });

    it('writes nothing when there is no credit', async () => {
      const queries: string[] = [];
      const manager = makeSweepManager([], captured, queries);

      const applied = await service.sweepCreditOntoMilestone(manager, PROJECT, 'm-new', 5000, USER);

      expect(applied).toBe(0);
      expect(captured.allocations).toHaveLength(0);
    });

    it('is a no-op for a non-positive or non-integer capacity', async () => {
      const queries: string[] = [];
      const manager = makeSweepManager([{ entryId: 'e1', remainderPaise: 500 }], captured, queries);

      expect(await service.sweepCreditOntoMilestone(manager, PROJECT, 'm', 0, USER)).toBe(0);
      expect(await service.sweepCreditOntoMilestone(manager, PROJECT, 'm', -100, USER)).toBe(0);
      expect(await service.sweepCreditOntoMilestone(manager, PROJECT, 'm', 1.5, USER)).toBe(0);
      // Not even the lock should be taken.
      expect(queries).toHaveLength(0);
      expect(captured.allocations).toHaveLength(0);
    });
  });
});
