import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

/**
 * Commission side of a queue decision, run INSIDE the approval's transaction
 * so the expense and the commission move together or not at all.
 *
 * Plain functions on a manager, not a service: payment-approvals must not
 * import the employees module graph (the house pattern, as in
 * project-cancellation.service.ts, is raw SQL on employee_commissions).
 */
export async function markCommissionPaid(
  m: EntityManager,
  input: {
    payoutRequestId: string;
    ledgerEntryId: string;
    approverId: string;
    valueDate: string;
    paymentMethod: string | null;
    reference: string | null;
  },
): Promise<void> {
  // TypeORM returns [rows, rowCount] for an UPDATE ... RETURNING on postgres —
  // so `result.length` is ALWAYS 2 and says nothing about how many rows
  // changed. Destructure the row array explicitly.
  const [rows]: [Array<{ id: string }>, number] = await m.query(
    `UPDATE employee_commissions
        SET status = 'paid', paid_at = $3, paid_by = $4, payment_mode = $5,
            payment_reference = $6, expense_entry_id = $2, payout_rejected_reason = NULL,
            updated_by = $4, updated_at = now()
      WHERE payout_request_id = $1 AND status = 'approved'
      RETURNING id`,
    [input.payoutRequestId, input.ledgerEntryId, input.valueDate, input.approverId, input.paymentMethod, input.reference],
  );
  if (rows.length !== 1) {
    // Spec §8 step 4 (amended): nothing is posted; the approver rejects it.
    throw new ConflictException('This commission was cancelled or changed. Reject this request.');
  }
}

/** `updatedBy`: the approver who rejected, or the submitter who withdrew. */
export async function releaseCommissionPayout(
  m: EntityManager,
  payoutRequestId: string,
  reason: string,
  updatedBy: string | null,
): Promise<void> {
  await m.query(
    `UPDATE employee_commissions
        SET payout_request_id = NULL, payout_rejected_reason = $2,
            updated_by = COALESCE($3, updated_by), updated_at = now()
      WHERE payout_request_id = $1 AND status = 'approved'`,
    [payoutRequestId, reason, updatedBy],
  );
}
