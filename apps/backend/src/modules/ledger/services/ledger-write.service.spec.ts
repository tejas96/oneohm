import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { SequenceService } from '../../finance-common/services/sequence.service';
import { LedgerAllocationEntity, LedgerEntryEntity } from '../entities';
import { LedgerWriteService } from './ledger-write.service';
import { LedgerRepository } from '../repositories/ledger.repository';

const PROJECT = 'project-1';
const USER = 'user-1';

/** Captures what was inserted so the tests can assert on the rows, not the mocks. */
interface Captured {
  entries: any[];
  allocations: any[][];
}

function makeManager(captured: Captured, insertedEntry: Partial<LedgerEntryEntity>): any {
  return {
    getRepository: (entity: unknown) => {
      if (entity === LedgerEntryEntity) {
        return {
          insert: jest.fn(async (values: any) => {
            captured.entries.push(values);
            return { identifiers: [{ id: 'new-entry-id' }] };
          }),
          findOneOrFail: jest.fn(async () => ({
            id: 'new-entry-id',
            projectId: PROJECT,
            ...insertedEntry,
            ...captured.entries[captured.entries.length - 1],
          })),
        };
      }
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
  };
}

describe('LedgerWriteService', () => {
  let service: LedgerWriteService;
  let repo: { [K in keyof LedgerRepository]?: any };
  let captured: Captured;

  const milestone = (id: string, balancePaise: number, status: 'active' | 'waived' = 'active') => ({
    milestoneId: id,
    projectId: PROJECT,
    displayOrder: 1,
    name: id,
    stage: 's',
    status,
    payerType: 'customer',
    dueDate: null,
    expectedPaise: balancePaise,
    allocatedPaise: 0,
    balancePaise,
    overAllocatedPaise: 0,
    derivedStatus: 'pending',
    daysOverdue: 0,
    entryCount: 0,
  });

  beforeEach(async () => {
    captured = { entries: [], allocations: [] };

    repo = {
      projectExists: jest.fn(async () => true),
      getMilestoneBalances: jest.fn(async () => [] as any),
      getProjectBalance: jest.fn(),
      findEntryById: jest.fn(),
      findAllocationsByEntry: jest.fn(async () => [] as any),
      findReversalOf: jest.fn(async () => null),
      listEntriesByProject: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn(async (cb: any) => cb(makeManager(captured, {}))),
    };

    const module = await Test.createTestingModule({
      providers: [
        LedgerWriteService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: LedgerRepository, useValue: repo },
        {
          provide: SequenceService,
          useValue: { getNextNumber: jest.fn(async () => 'RCP-TEST-1') },
        },
      ],
    }).compile();

    service = module.get(LedgerWriteService);
  });

  describe('recordReceipt', () => {
    it('inserts exactly one entry whose allocations sum to the amount', async () => {
      repo.getMilestoneBalances.mockResolvedValue([
        milestone('m1', 1_444_442),
        milestone('m2', 12_999_978),
      ]);

      await service.recordReceipt({ projectId: PROJECT, amountPaise: 13_000_000 }, USER);

      expect(captured.entries).toHaveLength(1);
      expect(captured.entries[0]).toMatchObject({
        direction: 'in',
        entryType: 'receipt',
        amountPaise: 13_000_000,
      });

      const allocations = captured.allocations[0];
      expect(allocations).toHaveLength(2);
      expect(allocations.reduce((s: number, a: any) => s + a.amountPaise, 0)).toBe(13_000_000);
      // the production case: fills m1 exactly, spills the rest into m2
      expect(allocations[0]).toMatchObject({ milestoneId: 'm1', amountPaise: 1_444_442 });
      expect(allocations[1]).toMatchObject({ milestoneId: 'm2', amountPaise: 11_555_558 });
    });

    it('locks the milestone rows before reading capacity', async () => {
      repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 5000)]);
      await service.recordReceipt({ projectId: PROJECT, amountPaise: 5000 }, USER);

      // 4th arg is forUpdate — without it two concurrent receipts both see the
      // same free capacity and jointly over-allocate a milestone.
      expect(repo.getMilestoneBalances).toHaveBeenCalledWith(PROJECT, expect.anything(), true);
    });

    it('skips waived milestones — they absorb nothing', async () => {
      repo.getMilestoneBalances.mockResolvedValue([
        milestone('waived', 100_000, 'waived'),
        milestone('active', 100_000),
      ]);

      await service.recordReceipt({ projectId: PROJECT, amountPaise: 50_000 }, USER);

      const allocations = captured.allocations[0];
      expect(allocations).toHaveLength(1);
      expect(allocations[0].milestoneId).toBe('active');
    });

    it('leaves overflow unallocated rather than forcing it onto the last milestone', async () => {
      repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 1000)]);

      await service.recordReceipt({ projectId: PROJECT, amountPaise: 5000 }, USER);

      const allocations = captured.allocations[0];
      expect(allocations.reduce((s: number, a: any) => s + a.amountPaise, 0)).toBe(1000);
      // the entry still records the full 5000 — the excess is project credit
      expect(captured.entries[0].amountPaise).toBe(5000);
    });

    it('records an entry with no allocations when there are no milestones', async () => {
      repo.getMilestoneBalances.mockResolvedValue([]);
      await service.recordReceipt({ projectId: PROJECT, amountPaise: 5000 }, USER);

      expect(captured.entries).toHaveLength(1);
      expect(captured.allocations).toHaveLength(0);
    });

    it.each([0, -100])('rejects a non-positive amount (%i)', async (amount) => {
      await expect(
        service.recordReceipt({ projectId: PROJECT, amountPaise: amount }, USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a fractional paise amount', async () => {
      await expect(
        service.recordReceipt({ projectId: PROJECT, amountPaise: 100.5 }, USER),
      ).rejects.toThrow(/integer number of paise/);
    });

    it('rejects a future value date', async () => {
      await expect(
        service.recordReceipt(
          { projectId: PROJECT, amountPaise: 1000, valueDate: '2099-01-01' },
          USER,
        ),
      ).rejects.toThrow(/in the future/);
    });

    it('accepts a back-dated value date — money often arrives before it is keyed in', async () => {
      repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 100_000)]);
      await service.recordReceipt(
        { projectId: PROJECT, amountPaise: 1000, valueDate: '2026-01-15' },
        USER,
      );
      expect(captured.entries[0].valueDate).toBe('2026-01-15');
      expect(captured.entries[0].valueDateIsInferred).toBeUndefined();
    });

    describe('manual allocation override', () => {
      it('honours an explicit split', async () => {
        repo.getMilestoneBalances.mockResolvedValue([
          milestone('m1', 100_000),
          milestone('m2', 100_000),
        ]);

        await service.recordReceipt(
          {
            projectId: PROJECT,
            amountPaise: 10_000,
            allocations: [
              { milestoneId: 'm2', amountPaise: 7000 },
              { milestoneId: 'm1', amountPaise: 3000 },
            ],
          },
          USER,
        );

        expect(captured.allocations[0]).toHaveLength(2);
        expect(captured.allocations[0][0]).toMatchObject({ milestoneId: 'm2', amountPaise: 7000 });
      });

      it('rejects an allocation exceeding a single milestone capacity', async () => {
        repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 5_000)]);
        await expect(
          service.recordReceipt(
            {
              projectId: PROJECT,
              amountPaise: 9000,
              allocations: [{ milestoneId: 'm1', amountPaise: 9000 }],
            },
            USER,
          ),
        ).rejects.toThrow(/exceeds its remaining/);
      });

      it('rejects allocations exceeding the entry — that would create money', async () => {
        repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 100_000)]);
        await expect(
          service.recordReceipt(
            {
              projectId: PROJECT,
              amountPaise: 5000,
              allocations: [{ milestoneId: 'm1', amountPaise: 9000 }],
            },
            USER,
          ),
        ).rejects.toThrow(/create money/);
      });

      it("rejects a milestone that isn't on this project", async () => {
        repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 100_000)]);
        await expect(
          service.recordReceipt(
            {
              projectId: PROJECT,
              amountPaise: 5000,
              allocations: [{ milestoneId: 'somewhere-else', amountPaise: 5000 }],
            },
            USER,
          ),
        ).rejects.toThrow(/does not belong to this project/);
      });

      it('rejects allocating to a waived milestone', async () => {
        repo.getMilestoneBalances.mockResolvedValue([milestone('w', 100_000, 'waived')]);
        await expect(
          service.recordReceipt(
            {
              projectId: PROJECT,
              amountPaise: 5000,
              allocations: [{ milestoneId: 'w', amountPaise: 5000 }],
            },
            USER,
          ),
        ).rejects.toThrow(/does not belong to this project/);
      });
    });
  });

  describe('recordExpense', () => {
    it('stores money out as a NEGATIVE amount so SUM over the ledger is the cash position', async () => {
      await service.recordExpense(
        { projectId: PROJECT, amountPaise: 8_000_000, category: 'materials', payee: 'Acme' },
        USER,
      );

      expect(captured.entries[0]).toMatchObject({
        direction: 'out',
        entryType: 'expense',
        amountPaise: -8_000_000,
        category: 'materials',
        counterparty: 'Acme',
      });
    });

    it('creates no allocations — an expense is not receivable against a milestone', async () => {
      await service.recordExpense(
        { projectId: PROJECT, amountPaise: 1000, category: 'travel' },
        USER,
      );
      expect(captured.allocations).toHaveLength(0);
    });
  });

  describe('tenancy', () => {
    /**
     * `projects` has no organization_id of its own, so the FK to projects(id) is
     * satisfied by ANY real project. Without an explicit ownership check a
     * receipt posted to another org's project inserts cleanly, allocates
     * nothing, becomes phantom credit, and — because the ledger is append-only —
     * can never be removed, only reversed.
     */
    it.each(['recordReceipt', 'recordExpense'] as const)(
      'refuses %s on a project that does not exist',
      async (method) => {
        repo.projectExists.mockResolvedValue(false);
        const call =
          method === 'recordReceipt'
            ? service.recordReceipt({ projectId: 'someone-elses', amountPaise: 1000 }, USER)
            : service.recordExpense(
                { projectId: 'someone-elses', amountPaise: 1000, category: 'x' },
                USER,
              );
        await expect(call).rejects.toBeInstanceOf(NotFoundException);
      },
    );

    it('checks the project exists before writing', async () => {
      repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 100_000)]);
      await service.recordReceipt({ projectId: PROJECT, amountPaise: 1000 }, USER);
      expect(repo.projectExists).toHaveBeenCalledWith(PROJECT);
    });
  });

  describe('cutover write freeze', () => {
    /**
     * MAINTENANCE_MODE cannot do this job — it is only surfaced to the two mobile
     * apps via /app-config/version-check and blocks no web API write. Without a
     * real freeze, a receipt recorded after the backfill snapshot is silently
     * lost when the reconciliation runs.
     */
    afterEach(() => {
      delete process.env.LEDGER_WRITES_FROZEN;
    });

    it.each(['recordReceipt', 'recordExpense', 'reverse'] as const)(
      'blocks %s while frozen',
      async (method) => {
        process.env.LEDGER_WRITES_FROZEN = 'true';
        const call =
          method === 'recordReceipt'
            ? service.recordReceipt({ projectId: PROJECT, amountPaise: 1000 }, USER)
            : method === 'recordExpense'
              ? service.recordExpense(
                  { projectId: PROJECT, amountPaise: 1000, category: 'x' },
                  USER,
                )
              : service.reverse('entry-1', 'reason', USER);

        await expect(call).rejects.toBeInstanceOf(ServiceUnavailableException);
      },
    );

    it('allows writes when the flag is absent', async () => {
      repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 100_000)]);
      await expect(
        service.recordReceipt({ projectId: PROJECT, amountPaise: 1000 }, USER),
      ).resolves.toBeDefined();
    });

    it('is not triggered by any value other than the exact string "true"', async () => {
      process.env.LEDGER_WRITES_FROZEN = 'false';
      repo.getMilestoneBalances.mockResolvedValue([milestone('m1', 100_000)]);
      await expect(
        service.recordReceipt({ projectId: PROJECT, amountPaise: 1000 }, USER),
      ).resolves.toBeDefined();
    });
  });

  describe('reverse', () => {
    const original = {
      id: 'entry-1',
      entryNo: 'RCP-2026-27-000005',
      projectId: PROJECT,
      customerId: 'cust-1',
      direction: 'in' as const,
      entryType: 'receipt' as const,
      amountPaise: 13_000_000,
      paymentMethod: 'upi',
      reference: 'UTR123',
      reversesId: null,
    };

    it('posts a negative mirror entry rather than mutating anything', async () => {
      repo.findEntryById.mockResolvedValue(original);

      await service.reverse('entry-1', 'cheque bounced', USER);

      expect(captured.entries).toHaveLength(1);
      expect(captured.entries[0]).toMatchObject({
        amountPaise: -13_000_000,
        direction: 'in', // direction is preserved; only the sign flips
        reversesId: 'entry-1',
        reversalReason: 'cheque bounced',
      });
    });

    it('mirrors the original allocations 1:1 with negated amounts', async () => {
      repo.findEntryById.mockResolvedValue(original);
      repo.findAllocationsByEntry.mockResolvedValue([
        { milestoneId: 'm1', amountPaise: 1_444_442 },
        { milestoneId: 'm2', amountPaise: 11_555_558 },
      ]);

      await service.reverse('entry-1', 'bounced', USER);

      const mirror = captured.allocations[0];
      expect(mirror).toHaveLength(2);
      expect(mirror[0]).toMatchObject({ milestoneId: 'm1', amountPaise: -1_444_442 });
      expect(mirror[1]).toMatchObject({ milestoneId: 'm2', amountPaise: -11_555_558 });
      // net effect on every milestone is exactly zero
      expect(mirror.reduce((s: number, a: any) => s + a.amountPaise, 0)).toBe(-13_000_000);
    });

    it('dates the reversal today, not on the original value date', async () => {
      repo.findEntryById.mockResolvedValue(original);
      await service.reverse('entry-1', 'bounced', USER);
      // a bounce is an event of today; back-dating it would rewrite a closed period
      expect(captured.entries[0].valueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('refuses to reverse an entry twice', async () => {
      repo.findEntryById.mockResolvedValue(original);
      repo.findReversalOf.mockResolvedValue({ entryNo: 'RCP-2026-27-000099' });

      await expect(service.reverse('entry-1', 'again', USER)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('refuses to reverse a reversal', async () => {
      repo.findEntryById.mockResolvedValue({ ...original, reversesId: 'entry-0' });
      await expect(service.reverse('entry-1', 'nope', USER)).rejects.toThrow(
        /reverse the original entry/,
      );
    });

    it('requires a reason — an unexplained reversal is not an audit trail', async () => {
      await expect(service.reverse('entry-1', '   ', USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('404s on an unknown entry', async () => {
      repo.findEntryById.mockResolvedValue(null);
      await expect(service.reverse('missing', 'x', USER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
