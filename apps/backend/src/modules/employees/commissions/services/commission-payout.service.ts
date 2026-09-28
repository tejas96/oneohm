import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CHANGED, CommissionActionsService } from './commission-actions.service';
import type { CurrentUserType } from '../../../auth/types';
import { PaymentApprovalService } from '../../../payment-approvals/services/payment-approval.service';
import type { RecordCommissionPaymentDto } from '../dto';
import type { CommissionRow } from '../sql/commission-read.sql';
import { requirePermission } from '../utils/require-permission';

/**
 * Split out of `CommissionActionsService` on purpose: this service depends on
 * `PaymentApprovalService`, and `PaymentApprovalModule` transitively imports
 * `EmployeesModule` (PaymentApprovalModule -> NotificationsModule ->
 * UsersModule -> EmployeesModule -> EmployeeCommissionsModule). Registering
 * this service and its controller in `EmployeeCommissionsModule` itself would
 * close that loop back on `EmployeeCommissionsModule`, and `forwardRef`
 * cannot safely paper over it — the plain (non-forwardRef) `import`
 * statement in `employees.module.ts` (`EmployeeCommissionsModule`) and in
 * `users.module.ts`/`employees.module.ts` mid-chain would still eagerly walk
 * the cycle at file-load time. Living in its own module, imported only by
 * `AppModule`, keeps `EmployeeCommissionsModule` a leaf with zero outgoing
 * imports, exactly as Task 4 left it.
 */
@Injectable()
export class CommissionPayoutService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly actions: CommissionActionsService,
    private readonly approvals: PaymentApprovalService,
  ) {}

  /**
   * One queue request per commission — each expense sits on its own project —
   * all sharing the one bank reference when a single transfer paid several.
   * All or nothing: one ineligible row fails the whole batch with its name.
   */
  async recordPayment(dto: RecordCommissionPaymentDto, user: CurrentUserType): Promise<CommissionRow[]> {
    requirePermission(user, 'finance.payments.record');
    const ids = [...new Set(dto.commissionIds)];

    const { rows, requestIds } = await this.dataSource.transaction(async (m) => {
      const requestIds: string[] = [];
      for (const id of ids) {
        await this.actions.lock(m, id);
        const row = await this.actions.getOne(id, m);
        if (row.state !== 'approved') {
          throw new ConflictException(
            `${row.quoteNumber}: only an Approved commission with a project can be paid (it is ${row.state.replace(/_/g, ' ')}).`,
          );
        }
        const requestId = await this.approvals.submitCommissionPayout(
          {
            projectId: row.projectId as string,
            customerId: row.customerId,
            amountPaise: row.amountPaise,
            valueDate: dto.valueDate,
            paymentMethod: dto.paymentMethod,
            reference: dto.reference,
            counterparty: row.resellerName,
            notes: [`Commission ${row.quoteNumber}`, dto.notes].filter(Boolean).join(' · '),
          },
          user.id,
          m,
        );
        const done: Array<{ id: string }> = await m.query(
          `UPDATE employee_commissions
              SET payout_request_id = $2, payout_rejected_reason = NULL,
                  invoice_number = COALESCE($3, invoice_number),
                  invoice_date = COALESCE($4::date, invoice_date),
                  updated_by = $5, updated_at = now()
            WHERE id = $1 AND status = 'approved' AND payout_request_id IS NULL
            RETURNING id`,
          [id, requestId, dto.invoiceNumber ?? null, dto.invoiceDate ?? null, user.id],
        );
        if (done.length !== 1) throw new ConflictException(CHANGED);
        requestIds.push(requestId);
      }
      const rows = await Promise.all(ids.map((id) => this.actions.getOne(id, m)));
      return { rows, requestIds };
    });

    requestIds.forEach((id) => this.approvals.notifySubmitted(id));
    return rows;
  }
}
