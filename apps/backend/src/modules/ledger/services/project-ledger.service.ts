import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { PaymentTermStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { pgDateToIso } from '../domain/dates';
import { paiseToRupees } from '../domain/paise';
import { LedgerRepository } from '../repositories/ledger.repository';

/**
 * The exact shape `ReceiptService.getProjectSummary` returns today.
 *
 * Reproduced field-for-field so `ConsumerProjectController` can swap its
 * injected dependency in a single commit without the customer-facing wire
 * changing at all. `consumer-contract.spec.ts` is the tripwire.
 */
export interface ProjectLedgerSummary {
  totals: {
    totalExpected: number;
    totalReceived: number;
    pending: number;
    receiptCount: number;
  };
  terms: Array<{
    id: string;
    name: string;
    displayOrder: number;
    expectedAmount: number;
    paidAmount: number;
    status: PaymentTermStatus;
    dueDate: string | null;
    payments: Array<{
      id: string;
      paymentNumber: string;
      paidAmount: number;
      paymentMethod: string;
      status: string;
      createdAt: string;
    }>;
  }>;
  nextDueTermId: string | null;
  overdueCount: number;
}

/**
 * Project-scoped reads, in the shape the consumer mobile app already expects.
 *
 * Behaviour that changes for customers at cutover — deliberate, and worth
 * flagging to finance before the switch:
 *
 *  - `paidAmount` inside `payments[]` is now the **allocation** amount, not the
 *    whole receipt. A ₹5L receipt split ₹3L/₹2L across two milestones correctly
 *    shows ₹3L under the first and ₹2L under the second; today it shows ₹5L
 *    under the first and nothing under the second.
 *  - `createdAt` is the **value date** — when the money actually moved — rather
 *    than the data-entry timestamp. The app labels this as the payment date.
 *    Historical rows are identical (backfilled from `created_at` in IST); new
 *    receipts get the correct date.
 *  - `status` is a constant `'cleared'`. The receipt FSM does not exist in an
 *    append-only ledger: an entry either stands or has a reversal. The app only
 *    upper-cases this string for display.
 */
@Injectable()
export class ProjectLedgerService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  async getProjectSummary(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectLedgerSummary> {
    const balance = await this.ledgerRepository.getProjectBalance(projectId, organizationId);
    if (!balance) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const milestones = await this.ledgerRepository.getMilestoneBalances(projectId, organizationId);

    // Allocations joined to their entries, so each milestone lists the receipts
    // that actually paid it — and how much of each landed here.
    //
    // Reversal mirrors are excluded. They are negative allocations against a
    // negative entry, and the app renders every item in `payments[]` as a
    // cleared payment — so a bounced cheque would show the customer a "cleared"
    // payment of MINUS rupees. The milestone's `allocated_paise` already nets
    // the reversal out, so the balance stays correct without listing it.
    //
    // The org predicate matters too: this was the only ledger read in the module
    // without one.
    const allocationRows: Array<{
      milestoneId: string;
      entryId: string;
      entryNo: string;
      allocatedPaise: string;
      paymentMethod: string | null;
      valueDate: string;
    }> = await this.dataSource.query(
      `SELECT
         a.milestone_id   AS "milestoneId",
         e.id             AS "entryId",
         e.entry_no       AS "entryNo",
         a.amount_paise   AS "allocatedPaise",
         e.payment_method AS "paymentMethod",
         e.value_date     AS "valueDate"
       FROM ledger_allocations a
       JOIN ledger_entries e ON e.id = a.entry_id
       WHERE a.project_id = $1
         AND e.organization_id = $2
         AND e.direction = 'in'
         AND e.reverses_id IS NULL
         AND a.amount_paise > 0
       ORDER BY e.value_date, e.created_at`,
      [projectId, organizationId],
    );

    const byMilestone = new Map<string, ProjectLedgerSummary['terms'][number]['payments']>();
    for (const row of allocationRows) {
      const list = byMilestone.get(row.milestoneId) ?? [];
      list.push({
        id: row.entryId,
        paymentNumber: row.entryNo,
        paidAmount: paiseToRupees(Number(row.allocatedPaise)),
        paymentMethod: row.paymentMethod ?? '',
        status: 'cleared',
        createdAt: this.toIsoTimestamp(row.valueDate),
      });
      byMilestone.set(row.milestoneId, list);
    }

    const terms = milestones.map((m) => ({
      id: m.milestoneId,
      name: m.name,
      displayOrder: m.displayOrder,
      expectedAmount: paiseToRupees(m.expectedPaise),
      paidAmount: paiseToRupees(m.allocatedPaise),
      status: this.toTermStatus(m.derivedStatus),
      dueDate: m.dueDate,
      payments: byMilestone.get(m.milestoneId) ?? [],
    }));

    const nextDue = milestones.find(
      (m) => m.derivedStatus === 'pending' || m.derivedStatus === 'partial',
    );

    return {
      totals: {
        totalExpected: paiseToRupees(balance.expectedPaise),
        totalReceived: paiseToRupees(balance.receivedPaise),
        pending: paiseToRupees(balance.outstandingPaise),
        receiptCount: balance.receiptCount,
      },
      terms,
      nextDueTermId: nextDue?.milestoneId ?? null,
      overdueCount: milestones.filter((m) => m.daysOverdue > 0).length,
    };
  }

  /**
   * The app renders this as the payment date, so it must be the value date
   * exactly — see `pgDateToIso` for why `.toISOString()` is wrong here.
   */
  private toIsoTimestamp(value: string | Date): string {
    return `${pgDateToIso(value)}T00:00:00.000Z`;
  }

  /**
   * Map the ledger's derived status onto the enum the mobile app switches on.
   *
   * `map-consumer-payments.ts` falls through to `'LOCKED'` for anything it does
   * not recognise, silently rendering a fully-paid milestone as a greyed-out
   * locked card. The four values below are the only ones ever emitted, and
   * `consumer-contract.spec.ts` pins that.
   */
  private toTermStatus(derived: 'pending' | 'partial' | 'paid' | 'waived'): PaymentTermStatus {
    switch (derived) {
      case 'paid':
        return PaymentTermStatus.PAID;
      case 'partial':
        return PaymentTermStatus.PARTIAL;
      case 'waived':
        return PaymentTermStatus.WAIVED;
      case 'pending':
        return PaymentTermStatus.PENDING;
    }
  }
}
