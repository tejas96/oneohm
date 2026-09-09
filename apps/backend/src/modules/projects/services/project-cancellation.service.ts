import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProjectStatus, StockAllocationStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { LeadClosureService } from '../../customers/services/lead-closure.service';
import { StockAllocationEntity } from '../../inventory/entities/stock-allocation.entity';
import { ReturnRequestService } from '../../inventory/services/return-request.service';
import { StockAllocationService } from '../../inventory/services/stock-allocation.service';
import { LedgerWriteService } from '../../ledger/services/ledger-write.service';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { CancelProjectDto, CancellationCleanupDto } from '../dto';
import { ProjectEntity } from '../entities/project.entity';
import { ProjectRepository } from '../repositories';

/**
 * Cancelling a project must leave nothing hanging.
 *
 * Everything reversible is reversed here. Anything physically out of the
 * warehouse cannot be reversed by a status flip — the panels are on someone's
 * roof — so it becomes a return request and shows on the cleanup checklist
 * until a person resolves it.
 */
@Injectable()
export class ProjectCancellationService {
  private readonly logger = new Logger(ProjectCancellationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly projectRepository: ProjectRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly leadClosureService: LeadClosureService,
    private readonly stockAllocationService: StockAllocationService,
    private readonly returnRequestService: ReturnRequestService,
    private readonly ledgerWriteService: LedgerWriteService,
  ) {}

  async cancel(projectId: string, dto: CancelProjectDto, userId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(projectId);
    if (project.status === ProjectStatus.CANCELLED) {
      throw new BadRequestException('Project is already cancelled');
    }
    if (project.status === ProjectStatus.COMPLETED) {
      throw new BadRequestException('A completed project cannot be cancelled');
    }

    // ProjectEntity carries only propertyId — the customer hangs off the
    // property, so read it here rather than reaching for project.customerId,
    // which does not exist.
    const property = await this.propertyRepository.findById(project.propertyId);
    if (!property) {
      throw new NotFoundException('Property not found for this project');
    }

    const settlementPreview = await this.getSettlementPreview(projectId);
    const collected: Record<string, number> = Object.fromEntries(
      settlementPreview.map((line) => [line.payerType, line.collectedPaise]),
    );
    const seenPayers = new Set<string>();
    for (const settlement of dto.settlements ?? []) {
      // Two lines for the same payer would each compute
      // `collected − kept` and each write a refund, paying the same money
      // back twice. One line per payer, as the DTO says.
      if (seenPayers.has(settlement.payerType)) {
        throw new BadRequestException(
          `Only one settlement line is allowed per payer; ${settlement.payerType} appears twice.`,
        );
      }
      seenPayers.add(settlement.payerType);

      const available = collected[settlement.payerType] ?? 0;
      if (settlement.keptPaise > available) {
        throw new BadRequestException(
          `Cannot keep more than was collected from the ${settlement.payerType}.`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Money owed stops being owed. Cash already allocated stays counted.
      //    Only `active` rows: `chk_payment_milestones_waive_fields` enforces
      //    `(status = 'waived') = (waived_at IS NOT NULL)`, so flipping an
      //    already-waived milestone to 'cancelled' would violate it.
      await manager.query(
        `UPDATE payment_milestones SET status = 'cancelled', updated_at = now()
          WHERE project_id = $1 AND status = 'active'`,
        [projectId],
      );

      // 2. Commissions nobody has been paid yet.
      await manager.query(
        `UPDATE employee_commissions SET status = 'cancelled', updated_at = now()
          WHERE project_id = $1 AND status IN ('pending', 'approved')`,
        [projectId],
      );

      // 3. The accepted quote stops locking the roof. `propertyId` is NOT NULL
      //    on ProjectEntity, so no guard is needed here. Nothing is excluded:
      //    voiding the accepted quote is the entire point, because that is
      //    what unlocks the roof.
      await this.quoteRepository.voidAllOpenForProperty(
        project.propertyId,
        `Project ${project.projectNumber} cancelled: ${dto.cancelReason}`,
        userId,
        manager,
      );

      // 4. The roof.
      if (dto.propertyOutcome === 'close') {
        await this.leadClosureService.markPropertyLost(
          project.propertyId,
          property.customerId,
          dto.cancelReason,
          dto.lossReason,
          userId,
          manager,
        );
      } else {
        // Handed straight back to the pipeline. `reopen` — not
        // `updateStatusById` — because the roof may well have been marked lost
        // before: a property closed on a rejection and later revived still
        // carries `lostReason` / `lossReason` / `lostAt`. Writing only
        // `status` would leave a live site displaying why it was lost and
        // counting into the loss-reason breakdown. `reopen` sets the status
        // and clears all three, in this transaction.
        await this.propertyRepository.reopen(project.propertyId, userId, manager);
      }

      // 5. Refunds. Keeping everything writes nothing.
      for (const settlement of dto.settlements ?? []) {
        const refundPaise = (collected[settlement.payerType] ?? 0) - settlement.keptPaise;
        if (refundPaise > 0) {
          await this.ledgerWriteService.recordRefund(
            {
              projectId,
              amountPaise: refundPaise,
              payee: settlement.payerType === 'lender' ? 'Lender' : 'Customer',
              notes: `Project ${project.projectNumber} cancelled: ${dto.cancelReason}`,
            },
            userId,
            manager,
          );
        }
      }

      // 6. Stamp the project. Settlement counts as answered even when the
      //    answer was "keep everything" — that is still an answer.
      await manager.query(
        `UPDATE projects
            SET status = 'cancelled', cancel_reason = $2, loss_reason = $3,
                cancelled_at = now(), settled_at = now(), settled_by = $4, updated_at = now()
          WHERE id = $1`,
        [projectId, dto.cancelReason, dto.lossReason, userId],
      );
    });

    // 7. Stock, outside the transaction: StockAllocationService.cancel opens
    //    its own transaction and takes a pessimistic lock on the allocation.
    //    Nesting it would deadlock against step 1's row locks.
    await this.releaseStock(projectId, project.projectNumber, dto.cancelReason, userId);

    return this.projectRepository.findById(projectId);
  }

  /**
   * Derived on read from the things that can still be outstanding. A stored
   * flag would be one more cache to fall out of step with the rows it
   * describes.
   *
   * Every gate is a PHYSICAL fact — stock the warehouse still holds or has
   * not got back, and orders still live with a supplier. Paperwork that
   * nobody can currently stamp is reported but does not gate; see
   * `unrecovered_commissions` below.
   */
  async getCleanup(projectId: string): Promise<CancellationCleanupDto> {
    // The query below has no FROM clause, so it returns exactly one row even
    // for an id that matches no project — and `settled_at IS NOT NULL` on zero
    // rows is SQL NULL, which would hand the caller `settled: null` where the
    // DTO promises a boolean. Guard first, the way cancel(), getTimeline() and
    // getProgress() all do, so a bad id is a 404 rather than a lie.
    await this.projectRepository.findById(projectId);

    const [row] = await this.dataSource.query(
      `SELECT
         (SELECT COALESCE(SUM(s.dispatched_quantity - s.returned_quantity), 0)
            FROM stock_allocations s
           WHERE s.project_id = $1
             AND s.dispatched_quantity > s.returned_quantity)::numeric    AS units_at_site,
         (SELECT COALESCE(SUM(s.allocated_quantity - s.dispatched_quantity), 0)
            FROM stock_allocations s
           WHERE s.project_id = $1
             AND s.status <> 'cancelled'
             AND s.allocated_quantity > s.dispatched_quantity)::numeric   AS units_reserved,
         (SELECT COUNT(*) FROM return_requests r
            JOIN stock_allocations s ON s.id = r.allocation_id
           WHERE s.project_id = $1 AND r.status = 'pending')::int         AS pending_returns,
         (SELECT COUNT(*) FROM purchase_orders po
           WHERE po.project_id = $1
             AND po.deleted_at IS NULL
             AND po.status NOT IN ('received', 'cancelled'))::int         AS open_purchase_orders,
         (SELECT COUNT(*) FROM employee_commissions c
           WHERE c.project_id = $1
             AND c.status = 'paid'
             AND c.recovered_at IS NULL)::int                             AS unrecovered_commissions,
         (SELECT settled_at IS NOT NULL FROM projects WHERE id = $1)      AS settled`,
      [projectId],
    );

    /*
      The gate is the physical fact in both directions.

      `units_at_site` is stock that left the warehouse and has not come back,
      NOT `pending_returns` — a return request that was never created must not
      read as "nothing to do".

      `units_reserved` is its mirror: stock the warehouse is still holding for
      a project that no longer exists. Cancellation releases it outside the
      transaction and only LOGS a failure, so without this line a failed
      release is invisible — a purely reserved allocation has
      `dispatched − returned = 0`, so `units_at_site` sees nothing and the
      project reports `settled` while the warehouse cannot sell the material.
      Cancelled allocations are excluded: their remainder was released when
      they were cancelled, though their allocated/dispatched figures remain.

      `unrecovered_commissions` is ADVISORY and deliberately NOT in this sum.
      Nothing in this codebase ever writes `employee_commissions.recovered_at`
      — the column exists in a migration and in the entity, and this SELECT is
      its only reader. Folding it in makes a gate nobody can clear: any
      cancelled project that ever paid a commission would report
      `cleanup_pending` forever, which teaches everyone to ignore the state
      entirely. It is reported so the money is visible, and it stays out of the
      arithmetic. Do NOT fold it back in until something can actually stamp
      recovery — a gate with no way to clear it is worse than no gate.
    */
    const open = Number(row.units_at_site) + Number(row.units_reserved) + row.open_purchase_orders;

    return {
      unitsAtSite: Number(row.units_at_site),
      unitsReserved: Number(row.units_reserved),
      pendingReturns: row.pending_returns,
      openPurchaseOrders: row.open_purchase_orders,
      unrecoveredCommissions: row.unrecovered_commissions,
      settled: row.settled,
      state: open === 0 && row.settled ? 'settled' : 'cleanup_pending',
    };
  }

  private async releaseStock(
    projectId: string,
    projectNumber: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    const allocations = await this.stockAllocationService.findByProject(projectId);
    const note = `Project ${projectNumber} cancelled: ${reason}`;

    for (const allocation of allocations) {
      // An already-cancelled allocation is NOT skipped. `StockAllocationService
      // .cancel` refuses only a fully DISPATCHED allocation, so cancelling a
      // partially dispatched one is allowed — it releases the undispatched
      // remainder and raises no return for what had already gone out. That
      // leaves a CANCELLED allocation with material at a customer's site and
      // nothing tracking it. Skipping it here would strand those panels
      // silently, and the cleanup checklist reads `return_requests`, so with no
      // row raised the project would report "settled" while the material is
      // still out. Only the release half is skipped below; the at-site recovery
      // still runs.
      const alreadyCancelled = allocation.status === StockAllocationStatus.CANCELLED;

      // What is physically at site is everything dispatched that has not
      // already come back. Raising a return for the gross dispatched figure
      // would ask for units nobody has, and `returnToStock` caps a return at
      // `dispatched − returned`, so such a request could never be completed.
      const atSite = Number(allocation.dispatchedQuantity) - Number(allocation.returnedQuantity);

      // Decide by quantity, not status. `status !== DISPATCHED` used to be the
      // guard here, but that misses COMPLETED — set once an allocation is
      // fully dispatched *and* delivered — so a completed allocation would
      // reach cancel(), find nothing undispatched to release, and still get
      // flipped to CANCELLED for no gain. cancel() itself only rejects a
      // DISPATCHED allocation, not a COMPLETED one, so the decision has to be
      // made here. The two quantities are disjoint — cancel() releases the
      // undispatched remainder, raiseReturn recovers what is at site — so both
      // can run on one allocation without double-counting, and neither
      // depends on the other succeeding.
      const undispatched =
        Number(allocation.allocatedQuantity) - Number(allocation.dispatchedQuantity);

      // This whole half runs after the cancellation has committed, so a
      // failure here must not report the cancellation as failed, and one bad
      // allocation must not strand the rest. Log loudly instead — and the
      // cleanup checklist is what surfaces whatever is left holding stock:
      // `units_reserved` catches a release that failed here (the warehouse
      // still holds it), `units_at_site` catches a recovery that failed. Both
      // read the quantities, not this method's success, so a swallowed error
      // cannot report itself as clean.
      // The two steps are independent, so each gets its own try/catch: one
      // failing must not silently skip the other, and the log must say which
      // recovery actually failed rather than blaming both on "released".
      // `alreadyCancelled` gates this half only. A cancelled allocation keeps
      // its allocated and dispatched figures, so `undispatched` is still
      // positive on one that was partially dispatched — but its remainder was
      // released when it was cancelled, and `cancel()` would throw "already
      // cancelled", logging a failure that is not one.
      if (!alreadyCancelled && undispatched > 0) {
        try {
          await this.stockAllocationService.cancel(allocation.id, note, userId);
        } catch (error) {
          this.logger.error(
            `Project ${projectNumber} cancelled, but allocation ${allocation.id}'s undispatched ` +
              `stock could not be released: ${String(error)}. Free this stock by hand.`,
          );
        }
      }

      // Anything already at site is a physical recovery, not a status flip.
      if (atSite > 0) {
        try {
          await this.raiseReturn(allocation, atSite, note, userId);
        } catch (error) {
          this.logger.error(
            `Project ${projectNumber} cancelled, but allocation ${allocation.id}'s return request ` +
              `for material at site could not be raised: ${String(error)}. Recover this material by hand.`,
          );
        }
      }
    }
  }

  /**
   * `return_requests.bom_id` is NOT NULL while `stock_allocations.bom_id` is
   * nullable, so fall back to the project's BOM. If there is no BOM at all we
   * cannot write the row — log loudly rather than lose the panels silently.
   */
  private async raiseReturn(
    allocation: StockAllocationEntity,
    quantity: number,
    reason: string,
    userId: string,
  ): Promise<void> {
    // An allocation cancelled on its own may already have a return outstanding
    // from whoever cancelled it. A second row for the same material cannot be
    // completed — `returnToStock` caps at `dispatched − returned`, so once the
    // first completes the second exceeds the cap and throws — leaving a pending
    // request nobody can clear.
    const pending = await this.returnRequestService.list({
      allocationId: allocation.id,
      status: 'pending',
    });
    if (pending.length > 0) {
      this.logger.log(
        `Allocation ${allocation.id} already has a pending return request; not raising another.`,
      );
      return;
    }

    // A BOM is nice to have, not required. Plenty of projects have none, and
    // the panels are at a customer's site either way — completing the return
    // resolves the allocation, not the BOM. This used to bail out and log,
    // which stranded the material AND let the cleanup checklist report the
    // project settled, since that checklist reads `return_requests`.
    const bomId =
      allocation.bomId ?? (await this.findProjectBomId(allocation.projectId)) ?? undefined;

    await this.returnRequestService.create(
      { allocationId: allocation.id, bomId, quantity, reason },
      userId,
    );
  }

  /** The table is `bom` (singular) — there is no `boms`. */
  private async findProjectBomId(projectId: string): Promise<string | null> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `SELECT id FROM bom WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [projectId],
    );
    return rows[0]?.id ?? null;
  }

  /**
   * Who actually paid, per payer. Allocations carry the payer through the
   * milestone they paid; cash that was never allocated to a milestone is the
   * customer's. Public because the cancel dialog pre-fills its settlement
   * lines from this exact figure — `cancel()` above calls it too, for the
   * refund math, so the two cannot disagree. Summing `allocatedPaise` by
   * `payerType` off the milestones endpoint instead would miss the
   * unallocated share computed below and under-state what the customer
   * actually paid.
   */
  async getSettlementPreview(
    projectId: string,
  ): Promise<Array<{ payerType: 'customer' | 'lender'; collectedPaise: number }>> {
    const rows: Array<{ payer_type: string; paise: string }> = await this.dataSource.query(
      `SELECT m.payer_type, SUM(a.amount_paise)::text AS paise
         FROM ledger_allocations a
         JOIN payment_milestones m ON m.id = a.milestone_id
        WHERE a.project_id = $1
        GROUP BY m.payer_type`,
      [projectId],
    );

    const totals: Record<string, number> = {};
    for (const row of rows) totals[row.payer_type] = Number(row.paise);

    const [unallocated]: Array<{ paise: string }> = await this.dataSource.query(
      `SELECT (COALESCE(SUM(e.amount_paise) FILTER (WHERE e.direction = 'in'), 0)
             - COALESCE((SELECT SUM(a.amount_paise) FROM ledger_allocations a
                          WHERE a.project_id = $1), 0))::text AS paise
         FROM ledger_entries e WHERE e.project_id = $1`,
      [projectId],
    );
    const spare = Math.max(Number(unallocated?.paise ?? 0), 0);
    if (spare > 0) totals.customer = (totals.customer ?? 0) + spare;

    // Zero-collected payers are omitted rather than sent as a zero-pre-filled
    // row: a payer who paid nothing has no settlement decision to make.
    return Object.entries(totals)
      .filter(([, collectedPaise]) => collectedPaise > 0)
      .map(([payerType, collectedPaise]) => ({
        payerType: payerType as 'customer' | 'lender',
        collectedPaise,
      }));
  }
}
