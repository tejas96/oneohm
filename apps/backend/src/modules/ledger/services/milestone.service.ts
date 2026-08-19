import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { AuditLogService } from '../../audit/services/audit-log.service';
import { rupeesToPaise, splitByPercentage } from '../domain/paise';
import { resolveSnapshotAmounts } from '../domain/schedule';
import { PaymentMilestoneEntity } from '../entities';
import { CreditSweepService } from './credit-sweep.service';
import { LedgerRepository } from '../repositories/ledger.repository';

/** A milestone as it appears on `quote_versions.payment_milestones` (jsonb). */
export interface SnapshotableMilestone {
  stage?: string;
  name?: string;
  description?: string;
  percentage?: number;
  amount?: number;
  order?: number;
  dueDate?: string;
}

export interface SnapshotParams {
  projectId: string;
  sourceVersionId: string | null;
  milestones: SnapshotableMilestone[] | null | undefined;
  /** Contract total in paise. Used to derive amounts when only percentages exist. */
  contractPaise?: number;
  createdBy: string;
  manager: EntityManager;
}

/**
 * The payment plan: creating it, amending it, and retiring parts of it.
 *
 * Money never appears here. A milestone says what is *expected*; what was
 * actually received lives in the ledger and is joined at read time by
 * `v_milestone_balance`. That separation is the whole point — the old
 * `project_payment_terms.paid_amount` column was a cache with two writers, and
 * it is what made every dashboard figure untrustworthy.
 */
@Injectable()
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly ledgerRepository: LedgerRepository,
    private readonly auditLog: AuditLogService,
    private readonly creditSweepService: CreditSweepService,
  ) {}

  /**
   * Record a plan change in the audit log.
   *
   * The LEDGER needs no audit trail — it is append-only, so its history is the
   * table itself. The milestone PLAN is different: it is mutable, and a waiver
   * or an amount change is exactly the kind of decision a client will later ask
   * to see justified.
   *
   * Written after the transaction commits rather than inside it, because
   * `AuditLogService` owns its own repository and cannot join our EntityManager.
   * The trade-off is deliberate: a crash between commit and audit loses the log
   * row but never the money, and the milestone itself still carries
   * `updated_by` / `waived_by`. Failures are logged, never swallowed silently,
   * and never allowed to fail the money operation.
   */
  private async audit(
    action: 'create' | 'update' | 'delete',
    milestone: PaymentMilestoneEntity,
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      const values = {
        projectId: milestone.projectId,
        name: milestone.name,
        amountPaise: milestone.amountPaise,
        status: milestone.status,
        source: milestone.source,
      };
      if (action === 'create') {
        await this.auditLog.logCreate('payment_milestone', milestone.id, values, userId, metadata);
      } else if (action === 'delete') {
        await this.auditLog.logDelete('payment_milestone', milestone.id, values, userId, metadata);
      } else {
        await this.auditLog.logUpdate(
          'payment_milestone',
          milestone.id,
          (metadata.before as Record<string, unknown>) ?? {},
          values,
          userId,
          metadata,
        );
      }
    } catch (error) {
      this.logger.error(
        `Audit log failed for milestone ${milestone.id} (${action}): ${(error as Error).message}`,
      );
    }
  }

  /**
   * Snapshot a quote version's milestones onto a project at conversion.
   *
   * Called inside the project-creation transaction, so a failure here rolls back
   * the whole conversion.
   *
   * Two improvements over the previous implementation:
   *
   *  - Milestones with a missing or non-positive amount are no longer **silently
   *    dropped** with a log line. They are derived from `percentage` when a
   *    contract total is available, and otherwise the whole snapshot fails. The
   *    old behaviour produced projects whose schedule summed to less than the
   *    contract, with a server log as the only trace.
   *  - The schedule always sums EXACTLY to the contract. Percentage-derived
   *    amounts get their remainder from `splitByPercentage`; quote-supplied
   *    amounts are reconciled by `resolveSnapshotAmounts`, which absorbs a
   *    rounding-sized difference, recomputes from percentages when a revision
   *    left stale rupee amounts, and throws on anything larger.
   */
  async snapshotFromQuoteVersion(params: SnapshotParams): Promise<PaymentMilestoneEntity[]> {
    const { projectId, sourceVersionId, milestones, contractPaise, createdBy, manager } = params;

    const repo = manager.getRepository(PaymentMilestoneEntity);

    const existing = await repo.find({
      where: { projectId },
      order: { displayOrder: 'ASC' },
    });
    if (existing.length > 0) {
      this.logger.log(
        `Skipping milestone snapshot for project ${projectId}: ${existing.length} already present.`,
      );
      return existing;
    }

    if (!milestones || milestones.length === 0) {
      this.logger.warn(
        `No milestones to snapshot for project ${projectId} (quote version ${sourceVersionId ?? 'n/a'}).`,
      );
      return [];
    }

    // #region agent log
    fetch('http://127.0.0.1:7349/ingest/4b53374e-fe26-4694-885e-4994385050c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5bace0'},body:JSON.stringify({sessionId:'5bace0',runId:'pre-fix',hypothesisId:'E',location:'milestone.service.ts:snapshotFromQuoteVersion',message:'Snapshot inputs before resolveAmounts',data:{projectId,sourceVersionId,contractPaise,milestoneCount:milestones.length,rawAmounts:milestones.map((m)=>({name:m.name,amount:m.amount,amountType:typeof m.amount,percentage:m.percentage}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const amounts = this.resolveAmounts(milestones, contractPaise, projectId);
    const lenderFunded = await this.isLoanFinanced(projectId, manager);

    const rows = milestones.map((m, idx) =>
      repo.create({
        projectId,
        source: 'quote_snapshot' as const,
        sourceQuoteVersionId: sourceVersionId,
        stage: m.stage ?? 'custom',
        name: m.name ?? `Milestone ${idx + 1}`,
        description: m.description ?? null,
        displayOrder: idx + 1,
        amountPaise: amounts[idx] as number,
        // Number.isFinite(0) is true, and quote_versions.payment_milestones is
        // untyped jsonb — a 0 or out-of-range value violates
        // chk_payment_milestones_percentage_range and, because the snapshot runs
        // inside the project-creation transaction, fails the whole conversion
        // with a raw constraint name. Percentage is display-only; amount_paise
        // is authoritative, so dropping a bad one costs nothing.
        percentage: this.safePercentage(m.percentage),
        // On a loan-financed project the largest instalment is the bank's — the
        // 70 of a 10/70/20. Marking it `lender` keeps the customer off the
        // chase list for money they were never going to pay.
        payerType:
          lenderFunded && amounts[idx] === Math.max(...amounts)
            ? ('lender' as const)
            : ('customer' as const),
        dueDate: m.dueDate ?? null,
        dueDateSource: m.dueDate ? ('manual' as const) : ('unset' as const),
        status: 'active' as const,
        createdBy,
        updatedBy: createdBy,
      }),
    );

    return repo.save(rows);
  }

  /**
   * A change order: extra scope the customer agreed to pay for.
   *
   * Free text and any amount — it is not restricted to BOM items. It is a
   * MILESTONE, never a ledger entry: a change order is not cash, and putting it
   * in the ledger would stop `SUM(amount_paise)` being the cash position, which
   * is the single property that justifies having a ledger at all.
   *
   * The contract total rises automatically, because contract is defined as
   * `SUM(payment_milestones.amount_paise)` rather than a stored column.
   */
  async addChangeOrder(
    projectId: string,
    input: { name: string; description?: string; amountPaise: number; dueDate?: string },
    createdBy: string,
  ): Promise<PaymentMilestoneEntity> {
    if (!input.name?.trim()) {
      throw new BadRequestException('A change order needs a description');
    }
    if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw new BadRequestException('Change order amount must be a positive integer paise value');
    }

    if (!(await this.ledgerRepository.projectExists(projectId))) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentMilestoneEntity);
      const [{ max }] = await manager.query(
        `SELECT COALESCE(MAX(display_order), 0) AS max FROM payment_milestones WHERE project_id = $1`,
        [projectId],
      );

      const created = await repo.save(
        repo.create({
          projectId,
          source: 'change_order' as const,
          stage: 'change_order',
          name: input.name.trim(),
          description: input.description ?? null,
          displayOrder: Number(max) + 1,
          amountPaise: input.amountPaise,
          payerType: 'customer' as const,
          dueDate: input.dueDate ?? null,
          dueDateSource: input.dueDate ? ('manual' as const) : ('unset' as const),
          status: 'active' as const,
          createdBy,
          updatedBy: createdBy,
        }),
      );
      // Apply any credit the customer already has. Without this a change order
      // raised against an overpaid project shows the full amount as outstanding
      // while the credit sits untouched beside it — the project simultaneously
      // reports "owes ₹5,000" and "₹26,431.96 unapplied", and the milestone
      // joins the receivables chase list for a customer who has overpaid.
      //
      // Runs on this transaction's manager, so the milestone and the allocations
      // commit or roll back together.
      const applied = await this.creditSweepService.sweepCreditOntoMilestone(
        manager,
        projectId,
        created.id,
        input.amountPaise,
        createdBy,
      );

      await this.audit('create', created, createdBy, {
        reason: 'change_order',
        description: input.description ?? null,
        creditAppliedPaise: applied,
      });
      return created;
    });
  }

  /**
   * Waive a milestone — typically a residual balance nobody intends to collect.
   *
   * Waived milestones are excluded from `expected_paise`, so outstanding drops,
   * but the row and its reason survive. They also absorb nothing in the
   * allocation waterfall.
   */
  async waive(
    milestoneId: string,
    reason: string,
    waivedBy: string,
  ): Promise<PaymentMilestoneEntity> {
    if (!reason?.trim()) {
      throw new BadRequestException('A waiver reason is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentMilestoneEntity);
      const milestone = await repo.findOne({ where: { id: milestoneId } });
      if (!milestone) {
        throw new NotFoundException(`Milestone ${milestoneId} not found`);
      }
      if (milestone.status === 'waived') {
        throw new ConflictException('Milestone is already waived');
      }

      const before = { status: milestone.status, amountPaise: milestone.amountPaise };

      milestone.status = 'waived';
      milestone.waivedReason = reason.trim();
      milestone.waivedAt = new Date();
      milestone.waivedBy = waivedBy;
      milestone.updatedBy = waivedBy;
      const saved = await repo.save(milestone);

      await this.audit('update', saved, waivedBy, {
        action: 'waive',
        reason: reason.trim(),
        before,
      });
      return saved;
    });
  }

  /**
   * Change a milestone's expected amount.
   *
   * Refused once any money is allocated against it. Editing an amount under
   * existing allocations is precisely what let the old system show a milestone
   * as `paid` while simultaneously reporting it outstanding — the amount moved
   * and nothing recomputed. Correct the allocation, or issue a change order.
   */
  async updateAmount(
    milestoneId: string,
    amountPaise: number,
    updatedBy: string,
  ): Promise<PaymentMilestoneEntity> {
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('Amount must be a positive integer paise value');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentMilestoneEntity);
      const milestone = await repo.findOne({ where: { id: milestoneId } });
      if (!milestone) {
        throw new NotFoundException(`Milestone ${milestoneId} not found`);
      }

      const [{ count }] = await manager.query(
        `SELECT COUNT(*)::int AS count FROM ledger_allocations WHERE milestone_id = $1`,
        [milestoneId],
      );
      if (Number(count) > 0) {
        throw new ConflictException(
          'Cannot change the amount of a milestone that already has payments allocated to it. ' +
            'Re-allocate the payments first, or raise a change order.',
        );
      }

      const before = { amountPaise: milestone.amountPaise };

      milestone.amountPaise = amountPaise;
      milestone.updatedBy = updatedBy;
      const saved = await repo.save(milestone);

      await this.audit('update', saved, updatedBy, { action: 'amount_change', before });
      return saved;
    });
  }

  /**
   * Delete a milestone. Guarded by `ON DELETE RESTRICT` from
   * `ledger_allocations`, so one with money against it cannot be removed —
   * the database refuses rather than orphaning the allocation.
   */
  async remove(milestoneId: string, deletedBy: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PaymentMilestoneEntity);
      const milestone = await repo.findOne({ where: { id: milestoneId } });
      if (!milestone) {
        throw new NotFoundException(`Milestone ${milestoneId} not found`);
      }
      try {
        await repo.delete({ id: milestoneId });
        await this.audit('delete', milestone, deletedBy, { action: 'milestone_deleted' });
      } catch {
        throw new ConflictException(
          'Cannot delete a milestone that has payments allocated to it. Waive it instead.',
        );
      }
    });
  }

  async listByProject(
    projectId: string,
  ): Promise<ReturnType<LedgerRepository['getMilestoneBalances']>> {
    return this.ledgerRepository.getMilestoneBalances(projectId);
  }

  // ============================================
  // INTERNALS
  // ============================================

  /**
   * Resolve a paise amount for every milestone, or fail loudly.
   *
   * Explicit `amount` wins. Otherwise, if every milestone carries a percentage
   * and a contract total is known, the amounts are derived with the
   * remainder-to-final rule so they sum exactly.
   */
  /**
   * Is this project financed by a loan?
   *
   * `wants_loan` on the property is the flag sales sets (70 of 578 properties
   * carry it); a `loan_applications` row is the stronger signal. Either counts —
   * the consequence is only who appears on the chase list, and a false positive
   * there is far cheaper than dunning a customer for the bank's instalment.
   */
  private async isLoanFinanced(projectId: string, manager: EntityManager): Promise<boolean> {
    const rows = await manager.query(
      `SELECT 1
         FROM projects p
         JOIN customer_properties cp ON cp.id = p.property_id
    LEFT JOIN loan_applications la   ON la.property_id = cp.id AND la.deleted_at IS NULL
        WHERE p.id = $1
          AND (cp.wants_loan = true OR la.id IS NOT NULL)
        LIMIT 1`,
      [projectId],
    );
    return rows.length > 0;
  }

  /** Display-only, and constrained to (0, 100] by the database. */
  private safePercentage(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100
      ? value
      : null;
  }

  private resolveAmounts(
    milestones: SnapshotableMilestone[],
    contractPaise: number | undefined,
    projectId: string,
  ): number[] {
    const explicit = milestones.map((m) =>
      Number.isFinite(m.amount) && (m.amount as number) > 0
        ? rupeesToPaise(m.amount as number)
        : null,
    );

    if (explicit.every((a): a is number => a !== null)) {
      // The quote's amounts are already rounded to two decimals, so they can
      // miss the contract by a few paise. Without this the project can never
      // be exactly settled — see reconcileToContract.
      // #region agent log
      {
        const sum = explicit.reduce((a, b) => a + b, 0);
        const diff = (contractPaise ?? 0) - sum;
        const resolvePayload = {projectId,explicit,contractPaise,sum,diff,absDiff:Math.abs(diff),tolerance:explicit.length,willThrow:!!(contractPaise&&contractPaise>0&&Math.abs(diff)>explicit.length)};
        this.logger.warn(`[debug-5bace0] resolveAmounts ${JSON.stringify(resolvePayload)}`);
        fetch('http://127.0.0.1:7349/ingest/4b53374e-fe26-4694-885e-4994385050c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5bace0'},body:JSON.stringify({sessionId:'5bace0',runId:'pre-fix',hypothesisId:'A',location:'milestone.service.ts:resolveAmounts',message:'Explicit milestone paise vs contract before reconcile',data:resolvePayload,timestamp:Date.now()})}).catch(()=>{});
      }
      // #endregion
      if (!contractPaise || contractPaise <= 0) {
        return explicit;
      }
      try {
        const resolved = resolveSnapshotAmounts(
          explicit,
          contractPaise,
          milestones.map((m) => Number(m.percentage)),
        );
        // #region agent log
        fetch('http://127.0.0.1:7349/ingest/4b53374e-fe26-4694-885e-4994385050c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5bace0'},body:JSON.stringify({sessionId:'5bace0',runId:'post-fix',hypothesisId:'B',location:'milestone.service.ts:resolveAmounts',message:'Resolved snapshot amounts',data:{projectId,usedPercentages:resolved.usedPercentages,resolved:resolved.amounts,resolvedSum:resolved.amounts.reduce((a,b)=>a+b,0),contractPaise},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (resolved.usedPercentages) {
          this.logger.warn(
            `Milestone rupee amounts for project ${projectId} summed to ${explicit.reduce((a, b) => a + b, 0)} against contract ${contractPaise}; deriving from stored percentages instead.`,
          );
        }
        return resolved.amounts;
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }

    const percentages = milestones.map((m) => m.percentage);
    const allPct = percentages.every((p) => Number.isFinite(p) && (p as number) > 0);

    if (allPct && contractPaise && contractPaise > 0) {
      this.logger.log(
        `Deriving milestone amounts for project ${projectId} from percentages over ₹${contractPaise / 100}`,
      );
      return splitByPercentage(contractPaise, percentages as number[]);
    }

    // Previously these were dropped with a logger.warn, producing a schedule
    // that silently summed to less than the contract.
    const bad = milestones
      .map((m, i) => (explicit[i] === null ? (m.name ?? `#${i + 1}`) : null))
      .filter(Boolean);
    throw new BadRequestException(
      `Cannot snapshot payment milestones for project ${projectId}: ` +
        `${bad.join(', ')} have no usable amount, and no percentage + contract total to derive one from.`,
    );
  }
}
