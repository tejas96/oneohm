import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentTermStatus } from '@tejas96/shared/types';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { PaymentTermEntity } from '../entities/payment-term.entity';

/**
 * Repository for PaymentTermEntity.
 *
 * Reads and lock-acquisition helpers. All writes go through the service so
 * version/aggregation invariants stay in one place.
 */
@Injectable()
export class PaymentTermRepository {
  constructor(
    @InjectRepository(PaymentTermEntity)
    private readonly repository: Repository<PaymentTermEntity>,
  ) {}

  /**
   * List terms for a project, ordered by display_order.
   */
  async findByProject(projectId: string, organizationId: string): Promise<PaymentTermEntity[]> {
    return this.repository.find({
      where: { projectId, organizationId, deletedAt: IsNull() },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string, organizationId: string): Promise<PaymentTermEntity | null> {
    return this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
  }

  /**
   * Acquire a row-level FOR UPDATE lock on a single term inside a
   * transaction. Used by the receipts service before re-aggregating
   * paid_amount and status, so concurrent receipts on the same term
   * cannot produce inconsistent state (plan §2.2 concurrency safety).
   */
  async findByIdForUpdate(
    manager: EntityManager,
    id: string,
    organizationId: string,
  ): Promise<PaymentTermEntity | null> {
    return manager
      .getRepository(PaymentTermEntity)
      .createQueryBuilder('term')
      .setLock('pessimistic_write')
      .where('term.id = :id', { id })
      .andWhere('term.organization_id = :organizationId', { organizationId })
      .andWhere('term.deleted_at IS NULL')
      .getOne();
  }

  /**
   * Highest existing display_order for a project (used to append new terms).
   */
  async getMaxDisplayOrder(projectId: string, organizationId: string): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('term')
      .select('COALESCE(MAX(term.display_order), 0)', 'maxOrder')
      .where('term.project_id = :projectId', { projectId })
      .andWhere('term.organization_id = :organizationId', { organizationId })
      .andWhere('term.deleted_at IS NULL')
      .getRawOne<{ maxOrder: string | number | null }>();

    const raw = row?.maxOrder;
    return typeof raw === 'string' ? parseInt(raw, 10) : (raw ?? 0);
  }

  /**
   * Returns true if the project already has at least one term row
   * (any status, including soft-deleted is excluded — only live rows count
   * for snapshot idempotency, per plan §11).
   */
  async projectHasAnyTerm(projectId: string, organizationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { projectId, organizationId, deletedAt: IsNull() },
    });
    return count > 0;
  }

  /**
   * Returns true if the project has any term that has received any payment.
   * Used as a preflight check on resnapshot (plan §11).
   */
  async projectHasReceivedPayments(projectId: string, organizationId: string): Promise<boolean> {
    const row = await this.repository
      .createQueryBuilder('term')
      .select('1')
      .where('term.project_id = :projectId', { projectId })
      .andWhere('term.organization_id = :organizationId', { organizationId })
      .andWhere('term.deleted_at IS NULL')
      .andWhere('term.paid_amount > 0')
      .limit(1)
      .getRawOne();
    return row !== undefined;
  }

  async countLinkedReceipts(termId: string, manager?: EntityManager): Promise<number> {
    const exec = manager ?? this.repository.manager;
    const rows = await exec.query(
      `SELECT COUNT(*)::int AS count
         FROM payments
        WHERE payment_term_id = $1
          AND deleted_at IS NULL`,
      [termId],
    );
    return rows[0]?.count ?? 0;
  }

  /**
   * Re-aggregate paid_amount + status for a single term inside a transaction.
   * Caller is responsible for having already acquired the FOR UPDATE lock on
   * the term via {@link findByIdForUpdate}.
   *
   * Aggregation rule (plan §2.2): sum paid_amount of all not-soft-deleted
   * payments linked to this term whose status is in (received, verified,
   * cleared). Bounced/refunded/pending receipts are excluded.
   */
  async reaggregateTerm(
    manager: EntityManager,
    termId: string,
  ): Promise<{ paidAmount: number; status: PaymentTermStatus; completedAt: Date | null }> {
    const sumRows = await manager.query(
      `SELECT COALESCE(SUM(paid_amount), 0)::numeric AS total
         FROM payments
        WHERE payment_term_id = $1
          AND deleted_at IS NULL
          AND status IN ('received','verified','cleared')`,
      [termId],
    );
    const paidAmount = Number(sumRows[0]?.total ?? 0);

    const termRows = await manager.query(
      `SELECT expected_amount::numeric AS expected, status
         FROM project_payment_terms
        WHERE id = $1`,
      [termId],
    );
    const expected = Number(termRows[0]?.expected ?? 0);
    const currentStatus = termRows[0]?.status ?? PaymentTermStatus.PENDING;

    // Waived/cancelled terms are terminal — never overwrite their status
    // from receipt aggregation. (paid_amount is still updated for ledger
    // accuracy.)
    let nextStatus: PaymentTermStatus;
    let completedAt: Date | null = null;

    if (
      currentStatus === PaymentTermStatus.WAIVED ||
      currentStatus === PaymentTermStatus.CANCELLED
    ) {
      nextStatus = currentStatus;
    } else if (paidAmount <= 0) {
      nextStatus = PaymentTermStatus.PENDING;
    } else if (expected - paidAmount >= 1.0) {
      nextStatus = PaymentTermStatus.PARTIAL;
    } else {
      nextStatus = PaymentTermStatus.PAID;
      completedAt = new Date();
    }

    await manager.query(
      `UPDATE project_payment_terms
          SET paid_amount  = $1::numeric,
              status       = $2::varchar,
              completed_at = CASE WHEN $2::varchar = 'paid' THEN COALESCE(completed_at, $3::timestamptz) ELSE NULL END,
              updated_at   = CURRENT_TIMESTAMP
        WHERE id = $4::uuid`,
      [paidAmount, nextStatus, completedAt, termId],
    );

    return { paidAmount, status: nextStatus, completedAt };
  }
}
