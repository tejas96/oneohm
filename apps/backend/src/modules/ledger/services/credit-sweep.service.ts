import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import {
  LOCK_PROJECT_CREDIT_ENTRIES,
  SELECT_PROJECT_CREDIT_REMAINDERS,
} from '../../../database/migrations/sql/ledger/10-sweep-existing-credit.sql';
import { LedgerAllocationEntity } from '../entities';

/**
 * Applies unallocated customer credit to a milestone created after the money
 * arrived.
 *
 * Split out of {@link LedgerWriteService} because it has a different caller and a
 * different lifecycle: the write path allocates at the moment a receipt is
 * recorded, whereas this runs when the PLAN changes — a change order raised
 * against a project that has already overpaid.
 */
@Injectable()
export class CreditSweepService {
  private readonly logger = new Logger(CreditSweepService.name);

  /**
   * Draw a project's unapplied credit onto a milestone created after the money
   * arrived, and return how much was applied.
   *
   * Allocation otherwise happens only when a receipt is recorded, against the
   * milestones that existed at that instant. Raise a change order afterwards and
   * it starts at zero however much the customer has already overpaid — so the
   * project reports an outstanding balance against someone in credit, and that
   * milestone joins the receivables chase list.
   *
   * Runs on the CALLER'S EntityManager and never opens its own transaction, so
   * the milestone and its allocations commit together and the deferred
   * over-allocation trigger evaluates once, at that single COMMIT.
   *
   * Two things here are load-bearing and easy to get wrong:
   *
   *   1. The lock and the remainder read are SEPARATE statements. Postgres runs
   *      READ COMMITTED, so each statement takes a fresh snapshot: a sweep that
   *      blocks on the lock re-reads remainders afterwards and sees the other
   *      sweep's committed allocations. Fold the lock into a CTE alongside the
   *      aggregate and both sweeps compute against the same pre-lock snapshot
   *      and spend the same credit twice.
   *
   *   2. Entries with a reversal are excluded outright. Reversal mirrors are
   *      written against the REVERSING entry, never the original, so a bounced
   *      receipt keeps a positive remainder forever. Allocating from it would
   *      pass the per-entry guard and mark a milestone paid with cash that never
   *      cleared.
   */
  async sweepCreditOntoMilestone(
    manager: EntityManager,
    projectId: string,
    milestoneId: string,
    capacityPaise: number,
    createdBy: string,
  ): Promise<number> {
    if (!Number.isInteger(capacityPaise) || capacityPaise <= 0) {
      return 0;
    }

    // Statement 1 — serialise against other sweeps on this project.
    await manager.query(LOCK_PROJECT_CREDIT_ENTRIES, [projectId]);

    // Statement 2 — fresh snapshot, so it sees anything the lock waited on.
    const rows: Array<{ entryId: string; remainderPaise: string | number }> = await manager.query(
      SELECT_PROJECT_CREDIT_REMAINDERS,
      [projectId],
    );

    let remainingCapacity = capacityPaise;
    const toInsert: Array<{
      entryId: string;
      milestoneId: string;
      projectId: string;
      amountPaise: number;
      isInferred: boolean;
      createdBy: string;
    }> = [];

    for (const row of rows) {
      if (remainingCapacity <= 0) break;
      // Raw query, so paise arrive as strings — coerce before arithmetic or the
      // `+` silently concatenates.
      const remainder = Number(row.remainderPaise);
      if (!Number.isFinite(remainder) || remainder <= 0) continue;

      const take = Math.min(remainder, remainingCapacity);
      toInsert.push({
        entryId: row.entryId,
        milestoneId,
        projectId,
        amountPaise: take,
        // Inferred: nobody chose this attribution, the waterfall did.
        isInferred: true,
        createdBy,
      });
      remainingCapacity -= take;
    }

    if (toInsert.length === 0) {
      return 0;
    }

    await manager.getRepository(LedgerAllocationEntity).insert(toInsert);
    const applied = capacityPaise - remainingCapacity;
    this.logger.log(
      `Applied ${applied} paise of existing credit to milestone ${milestoneId} ` +
        `on project ${projectId} across ${toInsert.length} entry/entries`,
    );
    return applied;
  }
}
