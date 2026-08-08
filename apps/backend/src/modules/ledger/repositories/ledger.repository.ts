import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { LedgerAllocationEntity, LedgerEntryEntity } from '../entities';

/** A row of `v_milestone_balance`. All paise values arrive as numbers. */
export interface MilestoneBalanceRow {
  milestoneId: string;
  projectId: string;
  displayOrder: number;
  name: string;
  stage: string;
  status: 'active' | 'waived';
  payerType: 'customer' | 'lender';
  dueDate: string | null;
  expectedPaise: number;
  allocatedPaise: number;
  balancePaise: number;
  overAllocatedPaise: number;
  derivedStatus: 'pending' | 'partial' | 'paid' | 'waived';
  daysOverdue: number;
  entryCount: number;
}

/**
 * One allocation, joined to the entry that funded it.
 *
 * This is what a milestone drill-down must render: `allocatedPaise` is what this
 * entry put against THIS milestone, which is almost never the entry's own total.
 * A ₹3,00,000 receipt split across four milestones contributes a different
 * number to each one, and showing the entry total under all four — as the UI
 * previously did — overstates every line.
 */
export interface MilestoneAllocationRow {
  milestoneId: string;
  allocationId: string;
  entryId: string;
  entryNo: string;
  direction: 'in' | 'out';
  /** Amount this entry contributed to THIS milestone. Signed. */
  allocatedPaise: number;
  /** The entry's own total, for context. Never the milestone figure. */
  entryAmountPaise: number;
  valueDate: string;
  valueDateIsInferred: boolean;
  paymentMethod: string | null;
  reference: string | null;
  /** Set when this row belongs to a reversing entry. */
  reversesId: string | null;
  reversalReason: string | null;
  /** Entry number this one reverses, when it is a reversal. */
  reversesEntryNo: string | null;
  /** Entry number that reversed this one, when it has been reversed. */
  reversedByEntryNo: string | null;
  /** True when the waterfall chose this attribution, not a human. */
  isInferred: boolean;
}

/** A row of `v_project_balance`. */
export interface ProjectBalanceRow {
  projectId: string;
  customerId: string | null;
  contractPaise: number;
  /** The part of the contract that came from the signed quote. */
  quotedPaise: number;
  /** Everything agreed after signing. `quoted + changeOrder === contract`. */
  changeOrderPaise: number;
  expectedPaise: number;
  waivedPaise: number;
  receivedPaise: number;
  spentPaise: number;
  outstandingPaise: number;
  /** Money received but not attributed to any milestone — customer credit. */
  unallocatedPaise: number;
  netCashPaise: number;
  receiptCount: number;
  milestoneCount: number;
}

/**
 * Reads for the ledger. Writes live in the services, per house convention.
 *
 * Every balance is read from `v_milestone_balance` / `v_project_balance` — the
 * single definition of "outstanding". Nothing here recomputes money in JS; the
 * old module had at least eight competing definitions and two endpoints for the
 * same project that disagreed.
 */
@Injectable()
export class LedgerRepository {
  constructor(
    @InjectRepository(LedgerEntryEntity)
    private readonly entries: Repository<LedgerEntryEntity>,
    @InjectRepository(LedgerAllocationEntity)
    private readonly allocations: Repository<LedgerAllocationEntity>,
  ) {}

  private exec(manager?: EntityManager): EntityManager {
    return manager ?? this.entries.manager;
  }

  /**
   * Coerce paise columns returned by a RAW query.
   *
   * `paiseTransformer` only applies to entity reads — a raw `query()` hands back
   * whatever node-postgres produces, and `BIGINT` arrives as a **string**. Left
   * unconverted these values silently concatenate under `+` and compare
   * lexicographically under `>`, which is the precise defect this rebuild
   * exists to remove (`payment.service.ts:99-102`). Views are read raw, so every
   * numeric column coming out of one must pass through here.
   */
  private static num<T>(row: T, keys: readonly string[]): T {
    const record = row as unknown as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (value !== null && value !== undefined) {
        record[key] = Number(value);
      }
    }
    return row;
  }

  private static readonly MILESTONE_NUMERIC = [
    'displayOrder',
    'expectedPaise',
    'allocatedPaise',
    'balancePaise',
    'overAllocatedPaise',
    'daysOverdue',
    'entryCount',
  ] as const;

  private static readonly PROJECT_NUMERIC = [
    'contractPaise',
    'quotedPaise',
    'changeOrderPaise',
    'expectedPaise',
    'waivedPaise',
    'receivedPaise',
    'spentPaise',
    'outstandingPaise',
    'unallocatedPaise',
    'netCashPaise',
    'receiptCount',
    'milestoneCount',
  ] as const;

  /**
   * Milestone balances for a project, ordered.
   *
   * `forUpdate` takes a row lock on the underlying `payment_milestones` rows —
   * required before computing allocation capacity, otherwise two concurrent
   * receipts can both see the same free capacity and jointly over-allocate a
   * milestone. The lock is on the table, not the view, because a view cannot be
   * locked directly.
   */
  async getMilestoneBalances(
    projectId: string,
    manager?: EntityManager,
    forUpdate = false,
  ): Promise<MilestoneBalanceRow[]> {
    const exec = this.exec(manager);

    if (forUpdate) {
      await exec.query(
        `SELECT id FROM payment_milestones
          WHERE project_id = $1
          ORDER BY display_order, id
          FOR UPDATE`,
        [projectId],
      );
    }

    const rows: MilestoneBalanceRow[] = await exec.query(
      `SELECT
         milestone_id          AS "milestoneId",
         project_id            AS "projectId",
         display_order         AS "displayOrder",
         name, stage, status,
         payer_type            AS "payerType",
         to_char(due_date, 'YYYY-MM-DD') AS "dueDate",
         expected_paise        AS "expectedPaise",
         allocated_paise       AS "allocatedPaise",
         balance_paise         AS "balancePaise",
         over_allocated_paise  AS "overAllocatedPaise",
         derived_status        AS "derivedStatus",
         days_overdue          AS "daysOverdue",
         entry_count           AS "entryCount"
       FROM v_milestone_balance
       WHERE project_id = $1
       ORDER BY display_order`,
      [projectId],
    );

    return rows.map((r) => LedgerRepository.num(r, LedgerRepository.MILESTONE_NUMERIC));
  }

  private static readonly ALLOCATION_NUMERIC = ['allocatedPaise', 'entryAmountPaise'] as const;

  /**
   * Every allocation on a project, with its funding entry.
   *
   * No direction / reversal / positive-amount filter, deliberately. A reversal's
   * negative mirror rows are part of the milestone's story and must be visible:
   * hiding them while leaving the reversed original on screen — which is what the
   * UI used to do — renders money that never cleared as live cash, and makes the
   * header disagree with its own detail.
   */
  async getMilestoneAllocations(
    projectId: string,
    manager?: EntityManager,
  ): Promise<MilestoneAllocationRow[]> {
    const rows: MilestoneAllocationRow[] = await this.exec(manager).query(
      `SELECT a.milestone_id            AS "milestoneId",
              a.id                      AS "allocationId",
              e.id                      AS "entryId",
              e.entry_no                AS "entryNo",
              e.direction,
              a.amount_paise            AS "allocatedPaise",
              e.amount_paise            AS "entryAmountPaise",
              to_char(e.value_date, 'YYYY-MM-DD') AS "valueDate",
              e.value_date_is_inferred  AS "valueDateIsInferred",
              e.payment_method          AS "paymentMethod",
              e.reference,
              e.reverses_id             AS "reversesId",
              e.reversal_reason         AS "reversalReason",
              orig.entry_no             AS "reversesEntryNo",
              rev.entry_no              AS "reversedByEntryNo",
              a.is_inferred             AS "isInferred"
         FROM ledger_allocations a
         JOIN ledger_entries e ON e.id = a.entry_id
         LEFT JOIN ledger_entries orig ON orig.id = e.reverses_id
         LEFT JOIN ledger_entries rev  ON rev.reverses_id = e.id
        WHERE a.project_id = $1
        ORDER BY e.value_date, e.created_at, a.created_at`,
      [projectId],
    );
    return rows.map((r) => LedgerRepository.num(r, LedgerRepository.ALLOCATION_NUMERIC));
  }

  /**
   * Milestone balances with their allocations attached.
   *
   * Grouped here rather than in the UI so the join is done once, against real
   * keys, instead of the component pairing two independently-cached lists by
   * array position.
   */
  async getMilestoneBalancesWithAllocations(
    projectId: string,
    manager?: EntityManager,
  ): Promise<Array<MilestoneBalanceRow & { allocations: MilestoneAllocationRow[] }>> {
    const [balances, allocations] = await Promise.all([
      this.getMilestoneBalances(projectId, manager),
      this.getMilestoneAllocations(projectId, manager),
    ]);

    const byMilestone = new Map<string, MilestoneAllocationRow[]>();
    for (const a of allocations) {
      const list = byMilestone.get(a.milestoneId);
      if (list) list.push(a);
      else byMilestone.set(a.milestoneId, [a]);
    }

    return balances.map((m) => ({
      ...m,
      allocations: byMilestone.get(m.milestoneId) ?? [],
    }));
  }

  async getProjectBalance(
    projectId: string,
    manager?: EntityManager,
  ): Promise<ProjectBalanceRow | null> {
    const rows: ProjectBalanceRow[] = await this.exec(manager).query(
      `SELECT
         project_id        AS "projectId",
         customer_id       AS "customerId",
         contract_paise      AS "contractPaise",
         quoted_paise        AS "quotedPaise",
         change_order_paise  AS "changeOrderPaise",
         expected_paise    AS "expectedPaise",
         waived_paise      AS "waivedPaise",
         received_paise    AS "receivedPaise",
         spent_paise       AS "spentPaise",
         outstanding_paise AS "outstandingPaise",
         unallocated_paise AS "unallocatedPaise",
         net_cash_paise    AS "netCashPaise",
         receipt_count     AS "receiptCount",
         milestone_count   AS "milestoneCount"
       FROM v_project_balance
       WHERE project_id = $1`,
      [projectId],
    );
    const row = rows[0];
    return row ? LedgerRepository.num(row, LedgerRepository.PROJECT_NUMERIC) : null;
  }

  /**
   * Does this project exist and is it live?
   *
   * Was an org-ownership check before the app went single-tenant. The tenancy
   * half is gone, but the check is not redundant: it still rejects a write to a
   * soft-deleted project, which the FK to `projects(id)` happily accepts. The
   * ledger is append-only, so a bad row could only ever be reversed, never
   * removed — the guard stays.
   */
  async projectExists(projectId: string, manager?: EntityManager): Promise<boolean> {
    const rows = await this.exec(manager).query(
      `SELECT 1
         FROM projects p
        WHERE p.id = $1 AND p.deleted_at IS NULL
        LIMIT 1`,
      [projectId],
    );
    return rows.length > 0;
  }

  async findEntryById(
    id: string,
    manager?: EntityManager,
  ): Promise<LedgerEntryEntity | null> {
    return this.exec(manager)
      .getRepository(LedgerEntryEntity)
      .findOne({ where: { id } });
  }

  /** The allocations of an entry — needed to build its reversal mirror. */
  async findAllocationsByEntry(
    entryId: string,
    manager?: EntityManager,
  ): Promise<LedgerAllocationEntity[]> {
    return this.exec(manager).getRepository(LedgerAllocationEntity).find({ where: { entryId } });
  }

  /** Whether this entry already has a reversal. Enforced by a unique index too. */
  async findReversalOf(
    entryId: string,
    manager?: EntityManager,
  ): Promise<LedgerEntryEntity | null> {
    return this.exec(manager)
      .getRepository(LedgerEntryEntity)
      .findOne({ where: { reversesId: entryId } });
  }

  async listEntriesByProject(
    projectId: string,
    manager?: EntityManager,
  ): Promise<LedgerEntryEntity[]> {
    return this.exec(manager)
      .getRepository(LedgerEntryEntity)
      .find({
        where: { projectId },
        order: { valueDate: 'DESC', createdAt: 'DESC' },
      });
  }

  /** Unused today but kept symmetric with `allocations` injection. */
  get allocationRepository(): Repository<LedgerAllocationEntity> {
    return this.allocations;
  }
}
