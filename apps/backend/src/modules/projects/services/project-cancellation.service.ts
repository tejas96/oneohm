import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProjectStatus, PropertyStatus, StockAllocationStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { LeadClosureService } from '../../customers/services/lead-closure.service';
import { StockAllocationEntity } from '../../inventory/entities/stock-allocation.entity';
import { ReturnRequestService } from '../../inventory/services/return-request.service';
import { StockAllocationService } from '../../inventory/services/stock-allocation.service';
import { LedgerWriteService } from '../../ledger/services/ledger-write.service';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import { CancelProjectDto } from '../dto';
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

    const collected = await this.collectedByPayer(projectId);
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
        // Handed straight back to the pipeline. `updateStatusById` is the
        // existing transaction-aware setter; it does no ownership check, which
        // is fine because the project was already loaded above.
        await this.propertyRepository.updateStatusById(
          project.propertyId,
          PropertyStatus.ACTIVE,
          manager,
        );
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

  private async releaseStock(
    projectId: string,
    projectNumber: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    const allocations = await this.stockAllocationService.findByProject(projectId);
    const note = `Project ${projectNumber} cancelled: ${reason}`;

    for (const allocation of allocations) {
      if (allocation.status === StockAllocationStatus.CANCELLED) continue;

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
      // allocation must not strand the rest. Log loudly instead — Task 8's
      // cleanup checklist is what surfaces whatever is left holding stock.
      // The two steps are independent, so each gets its own try/catch: one
      // failing must not silently skip the other, and the log must say which
      // recovery actually failed rather than blaming both on "released".
      if (undispatched > 0) {
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
    const bomId = allocation.bomId ?? (await this.findProjectBomId(allocation.projectId));
    if (!bomId) {
      this.logger.error(
        `Allocation ${allocation.id} has ${quantity} dispatched units and no BOM; ` +
          `no return request could be raised. Recover this material by hand.`,
      );
      return;
    }
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
   * Who actually paid. Allocations carry the payer through the milestone they
   * paid; cash that was never allocated to a milestone is the customer's.
   */
  private async collectedByPayer(projectId: string): Promise<Record<string, number>> {
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

    return totals;
  }
}
