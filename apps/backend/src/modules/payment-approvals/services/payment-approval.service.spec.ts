import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { SequenceService } from '../../finance-common/services/sequence.service';
import { LedgerEntryEntity } from '../../ledger/entities';
import { LedgerRepository } from '../../ledger/repositories/ledger.repository';
import { LedgerWriteService } from '../../ledger/services/ledger-write.service';
import { PendingLedgerEntryEntity } from '../entities';
import { PaymentApprovalService } from './payment-approval.service';

const PROJECT = 'project-1';
const SUBMITTER = 'user-submitter';
const APPROVER = 'user-approver';
const TODAY = new Date().toISOString().slice(0, 10);

/** Rows the fake repository will serve, keyed by id. */
type Rows = Record<string, Partial<PendingLedgerEntryEntity>>;

interface Captured {
  inserted: any[];
  updated: Array<{ id: string; values: any }>;
}

function pending(over: Partial<PendingLedgerEntryEntity> = {}): Partial<PendingLedgerEntryEntity> {
  return {
    id: 'p-1',
    requestNo: 'PA-TEST-1',
    kind: 'receipt',
    status: 'pending',
    projectId: PROJECT,
    entryType: 'receipt',
    direction: 'in',
    amountPaise: 50_000,
    valueDate: '2026-08-01',
    submittedBy: SUBMITTER,
    submittedAt: new Date('2026-08-01T00:00:00Z'),
    ...over,
  };
}

function makeManager(rows: Rows, captured: Captured, ledgerRows: any[] = []): any {
  return {
    getRepository: (entity: unknown) => {
      if (entity === PendingLedgerEntryEntity) {
        return {
          findOne: jest.fn(async ({ where }: any) => rows[where.id] ?? null),
          findOneOrFail: jest.fn(async ({ where }: any) => rows[where.id]),
          insert: jest.fn(async (values: any) => {
            captured.inserted.push(values);
            rows['new-id'] = { id: 'new-id', ...values };
            return { identifiers: [{ id: 'new-id' }] };
          }),
          update: jest.fn(async (id: string, values: any) => {
            captured.updated.push({ id, values });
            rows[id] = { ...rows[id], ...values };
            return { affected: 1 };
          }),
          find: jest.fn(async () => []),
        };
      }
      if (entity === LedgerEntryEntity) {
        return {
          findOne: jest.fn(async ({ where }: any) => {
            if (where.reversesId) {
              return ledgerRows.find((r) => r.reversesId === where.reversesId) ?? null;
            }
            return ledgerRows.find((r) => r.id === where.id) ?? null;
          }),
        };
      }
      throw new Error('unexpected repository');
    },
  };
}

describe('PaymentApprovalService', () => {
  let service: PaymentApprovalService;
  let rows: Rows;
  let captured: Captured;
  let ledgerRows: any[];
  let ledgerWrite: { [K in keyof LedgerWriteService]?: any };
  let repoFind: any;
  let ledgerRepo: { getMilestoneBalances: any };
  let queryResults: any[];

  beforeEach(async () => {
    rows = {};
    captured = { inserted: [], updated: [] };
    ledgerRows = [];

    ledgerWrite = {
      recordReceipt: jest.fn(async () => ({ id: 'new-entry-id' })),
      recordExpense: jest.fn(async () => ({ id: 'new-entry-id' })),
      reverse: jest.fn(async () => ({ id: 'new-entry-id' })),
    };

    repoFind = jest.fn(async () => []);
    ledgerRepo = { getMilestoneBalances: jest.fn(async () => [] as any) };

    queryResults = [];
    const dataSource = {
      // list()/getOne() use raw SQL; each call shifts the next queued result.
      query: jest.fn(async () => queryResults.shift() ?? []),
      transaction: jest.fn(async (cb: any) => cb(makeManager(rows, captured, ledgerRows))),
      getRepository: jest.fn(() => ({
        findOne: jest.fn(async ({ where }: any) => rows[where.id] ?? null),
        find: repoFind,
        count: jest.fn(async () => 1),
      })),
    };

    const module = await Test.createTestingModule({
      providers: [
        PaymentApprovalService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: LedgerWriteService, useValue: ledgerWrite },
        { provide: LedgerRepository, useValue: ledgerRepo },
        {
          provide: SequenceService,
          useValue: { getNextNumber: jest.fn(async () => 'PA-2026-27-000001') },
        },
      ],
    }).compile();

    service = module.get(PaymentApprovalService);
  });

  describe('submit', () => {
    it('creates a pending receipt with a positive amount going in', async () => {
      await service.submit(
        { kind: 'receipt', projectId: PROJECT, amountPaise: 50_000, valueDate: '2026-08-01' },
        SUBMITTER,
      );

      expect(captured.inserted[0]).toMatchObject({
        kind: 'receipt',
        status: 'pending',
        direction: 'in',
        amountPaise: 50_000,
        requestNo: 'PA-2026-27-000001',
        submittedBy: SUBMITTER,
      });
    });

    it('stores an expense negative, matching the ledger sign convention', async () => {
      await service.submit(
        { kind: 'expense', projectId: PROJECT, amountPaise: 20_000, category: 'materials' },
        SUBMITTER,
      );

      expect(captured.inserted[0]).toMatchObject({
        direction: 'out',
        amountPaise: -20_000,
      });
    });

    it('refuses a future-dated payment', async () => {
      await expect(
        service.submit(
          { kind: 'receipt', projectId: PROJECT, amountPaise: 1_000, valueDate: '2099-01-01' },
          SUBMITTER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('takes amount and project from the target when reversing, not from the client', async () => {
      ledgerRows.push({
        id: 'entry-1',
        projectId: 'real-project',
        customerId: 'cust-1',
        entryType: 'receipt',
        direction: 'in',
        amountPaise: 77_777,
      });

      await service.submit(
        { kind: 'reversal', reversesEntryId: 'entry-1', reversalReason: 'wrong reference' },
        SUBMITTER,
      );

      expect(captured.inserted[0]).toMatchObject({
        kind: 'reversal',
        projectId: 'real-project',
        amountPaise: -77_777,
        reversesEntryId: 'entry-1',
      });
    });

    it('404s when reversing an entry that does not exist', async () => {
      await expect(
        service.submit(
          { kind: 'reversal', reversesEntryId: 'missing', reversalReason: 'x' },
          SUBMITTER,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts a full ISO datetime for today rather than calling it future-dated', async () => {
      // @IsDateString accepts datetimes; comparing the raw string against a bare
      // YYYY-MM-DD made a payment received TODAY look like tomorrow.
      const nowIso = `${TODAY}T09:00:00.000Z`;

      await service.submit(
        { kind: 'receipt', projectId: PROJECT, amountPaise: 1_000, valueDate: nowIso },
        SUBMITTER,
      );

      expect(captured.inserted[0]).toMatchObject({ valueDate: TODAY });
    });

    it('carries a manual allocation through instead of dropping it', async () => {
      const allocations = [{ milestoneId: 'm1', amountPaise: 30_000 }];

      await service.submit(
        { kind: 'receipt', projectId: PROJECT, amountPaise: 30_000, allocations },
        SUBMITTER,
      );

      expect(captured.inserted[0]).toMatchObject({ allocations });
    });

    it('never stores allocations on an expense', async () => {
      await service.submit(
        {
          kind: 'expense',
          projectId: PROJECT,
          amountPaise: 5_000,
          category: 'materials',
          allocations: [{ milestoneId: 'm1', amountPaise: 5_000 }],
        },
        SUBMITTER,
      );

      expect(captured.inserted[0]).toMatchObject({ allocations: null });
    });

    it('defaults value date to today when none is supplied', async () => {
      await service.submit({ kind: 'receipt', projectId: PROJECT, amountPaise: 1_000 }, SUBMITTER);
      expect(captured.inserted[0]).toMatchObject({ valueDate: TODAY });
    });
  });

  describe('approve', () => {
    it('refuses when the approver is the submitter', async () => {
      rows['p-1'] = pending();
      await expect(service.approve('p-1', SUBMITTER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a row that is not pending', async () => {
      rows['p-1'] = pending({ status: 'approved' });
      await expect(service.approve('p-1', APPROVER)).rejects.toBeInstanceOf(ConflictException);
    });

    it('404s on an unknown id', async () => {
      await expect(service.approve('nope', APPROVER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('writes the ledger entry and stamps the row, sharing one manager', async () => {
      rows['p-1'] = pending();

      await service.approve('p-1', APPROVER);

      expect(ledgerWrite.recordReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: PROJECT, amountPaise: 50_000, valueDate: '2026-08-01' }),
        APPROVER,
        expect.anything(),
      );
      expect(captured.updated[0]).toMatchObject({
        id: 'p-1',
        values: expect.objectContaining({
          status: 'approved',
          reviewedBy: APPROVER,
          ledgerEntryId: 'new-entry-id',
        }),
      });
    });

    it('keeps the original payment date rather than the approval date', async () => {
      rows['p-1'] = pending({ valueDate: '2026-07-15' });

      await service.approve('p-1', APPROVER);

      expect(ledgerWrite.recordReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ valueDate: '2026-07-15' }),
        APPROVER,
        expect.anything(),
      );
    });

    it('passes a positive magnitude to recordExpense, which negates it itself', async () => {
      rows['p-1'] = pending({
        kind: 'expense',
        entryType: 'expense',
        direction: 'out',
        amountPaise: -20_000,
        category: 'materials',
      });

      await service.approve('p-1', APPROVER);

      expect(ledgerWrite.recordExpense).toHaveBeenCalledWith(
        expect.objectContaining({ amountPaise: 20_000 }),
        APPROVER,
        expect.anything(),
      );
    });

    it('forwards a stored allocation to the ledger write', async () => {
      const allocations = [{ milestoneId: 'm1', amountPaise: 50_000 }];
      rows['p-1'] = pending({ allocations });

      await service.approve('p-1', APPROVER);

      expect(ledgerWrite.recordReceipt).toHaveBeenCalledWith(
        expect.objectContaining({ allocations }),
        APPROVER,
        expect.anything(),
      );
    });

    it('passes undefined, not null, when there is no manual allocation', async () => {
      rows['p-1'] = pending({ allocations: null });

      await service.approve('p-1', APPROVER);

      const [input] = ledgerWrite.recordReceipt.mock.calls[0] as [Record<string, unknown>];
      expect(input.allocations).toBeUndefined();
    });

    it('uses MISC for an expense with no category, not an invalid literal', async () => {
      rows['p-1'] = pending({
        kind: 'expense',
        entryType: 'expense',
        direction: 'out',
        amountPaise: -20_000,
        category: null,
      });

      await service.approve('p-1', APPROVER);

      expect(ledgerWrite.recordExpense).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'misc' }),
        APPROVER,
        expect.anything(),
      );
    });

    it('refuses a reversal whose target has already been reversed', async () => {
      rows['p-1'] = pending({ kind: 'reversal', reversesEntryId: 'entry-1' });
      ledgerRows.push({ id: 'entry-1', projectId: PROJECT });
      ledgerRows.push({ id: 'entry-2', reversesId: 'entry-1' });

      await expect(service.approve('p-1', APPROVER)).rejects.toBeInstanceOf(ConflictException);
      expect(ledgerWrite.reverse).not.toHaveBeenCalled();
    });
  });

  describe('reject and cancel', () => {
    it('rejects with a reason and never touches the ledger', async () => {
      rows['p-1'] = pending();

      await service.reject('p-1', 'UPI reference does not match', APPROVER);

      expect(captured.updated[0]?.values).toMatchObject({
        status: 'rejected',
        rejectionReason: 'UPI reference does not match',
        reviewedBy: APPROVER,
      });
      expect(ledgerWrite.recordReceipt).not.toHaveBeenCalled();
    });

    it('refuses to let you reject your own submission', async () => {
      rows['p-1'] = pending();
      await expect(service.reject('p-1', 'no', SUBMITTER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lets the submitter cancel their own row', async () => {
      rows['p-1'] = pending();
      await service.cancel('p-1', SUBMITTER);
      expect(captured.updated[0]?.values).toMatchObject({ status: 'cancelled' });
    });

    it('refuses to let anyone else cancel it', async () => {
      rows['p-1'] = pending();
      await expect(service.cancel('p-1', APPROVER)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('bulkApprove', () => {
    it('approves what it can and reports the rest', async () => {
      rows['ok'] = pending({ id: 'ok' });
      // Submitted by the approver, so four-eyes must refuse this one.
      rows['own'] = pending({ id: 'own', submittedBy: APPROVER });
      rows['done'] = pending({ id: 'done', status: 'approved' });

      const result = await service.bulkApprove(['ok', 'own', 'done'], APPROVER);

      expect(result.approved).toEqual(['ok']);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0]?.reason).toMatch(/another user must approve/i);
      expect(result.failed[1]?.reason).toMatch(/already/i);
    });

    it('does not leak a raw database error into the reason', async () => {
      rows['boom'] = pending({ id: 'boom' });
      ledgerWrite.recordReceipt.mockRejectedValueOnce(
        Object.assign(new Error('duplicate key value violates unique constraint "secret_idx"'), {
          code: '23505',
        }),
      );

      const result = await service.bulkApprove(['boom'], APPROVER);

      expect(result.failed[0]?.reason).not.toMatch(/unique constraint/i);
      expect(result.failed[0]?.reason).toMatch(/server log/i);
    });
  });

  describe('raw-SQL reads', () => {
    it('does not shift the payment date back a day', async () => {
      // node-postgres hydrates a `date` column as a JS Date at LOCAL midnight.
      // Serialising that to JSON in IST lands at 18:30 the PREVIOUS day, which
      // is exactly what pgDateToIso exists to prevent.
      const localMidnight = new Date(2026, 7, 8); // 8 Aug 2026, local
      queryResults = [[{ id: 'p-1', valueDate: localMidnight, amountPaise: '4500' }], [{ count: 1 }]];

      const result = await service.list({});

      expect(result.data[0]?.valueDate).toBe('2026-08-08');
    });

    it('returns amountPaise as a number, not the bigint string the driver gives', async () => {
      queryResults = [[{ id: 'p-1', valueDate: '2026-08-08', amountPaise: '4500' }], [{ count: 1 }]];

      const result = await service.list({});

      expect(result.data[0]?.amountPaise).toBe(4500);
    });
  });

  describe('previewImpact with a manual allocation', () => {
    it('previews the split that will actually be applied', async () => {
      rows['p-1'] = pending({
        amountPaise: 60_000,
        allocations: [{ milestoneId: 'm2', amountPaise: 60_000 }],
      });
      ledgerRepo.getMilestoneBalances.mockResolvedValue([
        { milestoneId: 'm1', name: 'Advance', status: 'active', balancePaise: 50_000 },
        { milestoneId: 'm2', name: 'On delivery', status: 'active', balancePaise: 90_000 },
      ] as any);

      const result = await service.previewImpact('p-1');

      // The waterfall would have filled Advance first; the manual split does not.
      expect(result.lines).toEqual([
        expect.objectContaining({ milestoneName: 'On delivery', appliedPaise: 60_000 }),
      ]);
    });
  });

  describe('previewImpact', () => {
    const milestone = (id: string, balancePaise: number, name: string) => ({
      milestoneId: id,
      name,
      status: 'active',
      balancePaise,
    });

    it('shows which milestones a receipt would settle', async () => {
      rows['p-1'] = pending({ amountPaise: 60_000 });
      ledgerRepo.getMilestoneBalances.mockResolvedValue([
        milestone('m1', 50_000, 'Advance'),
        milestone('m2', 30_000, 'On delivery'),
      ]);

      const result = await service.previewImpact('p-1');

      expect(result.lines).toEqual([
        expect.objectContaining({ milestoneName: 'Advance', appliedPaise: 50_000, settlesFully: true }),
        expect.objectContaining({
          milestoneName: 'On delivery',
          appliedPaise: 10_000,
          balanceAfterPaise: 20_000,
          settlesFully: false,
        }),
      ]);
      expect(result.unallocatedPaise).toBe(0);
    });

    it('reports the excess as credit when the payment exceeds what is due', async () => {
      rows['p-1'] = pending({ amountPaise: 90_000 });
      ledgerRepo.getMilestoneBalances.mockResolvedValue([milestone('m1', 50_000, 'Advance')]);

      const result = await service.previewImpact('p-1');

      expect(result.unallocatedPaise).toBe(40_000);
    });

    it('returns nothing to allocate for an expense', async () => {
      rows['p-1'] = pending({ kind: 'expense', amountPaise: -20_000 });

      const result = await service.previewImpact('p-1');

      expect(result).toEqual({ lines: [], unallocatedPaise: 0 });
    });
  });

  describe('duplicate detection', () => {
    it('reports another payment with the same project, amount and date', async () => {
      repoFind.mockResolvedValue([pending({ id: 'other', submittedAt: new Date() })]);

      const dupes = await service.findDuplicates(PROJECT, 50_000, '2026-08-01');

      expect(dupes).toHaveLength(1);
    });

    it('ignores one submitted longer ago than the window', async () => {
      const old = new Date(Date.now() - 48 * 3_600_000);
      repoFind.mockResolvedValue([pending({ id: 'other', submittedAt: old })]);

      await expect(service.findDuplicates(PROJECT, 50_000, '2026-08-01')).resolves.toHaveLength(0);
    });

    it('ignores a rejected row — it is not a competing claim', async () => {
      repoFind.mockResolvedValue([
        pending({ id: 'other', submittedAt: new Date(), status: 'rejected' }),
      ]);

      await expect(service.findDuplicates(PROJECT, 50_000, '2026-08-01')).resolves.toHaveLength(0);
    });
  });
});
