import { Module } from '@nestjs/common';

import { CommissionPayoutController } from './controllers/commission-payout.controller';
import { EmployeeCommissionsModule } from './employee-commissions.module';
import { CommissionPayoutService } from './services/commission-payout.service';
import { PaymentApprovalModule } from '../../payment-approvals/payment-approval.module';

/**
 * Kept OUT of `EmployeeCommissionsModule` deliberately.
 *
 * `PaymentApprovalModule` transitively imports `EmployeesModule`
 * (PaymentApprovalModule -> NotificationsModule -> UsersModule ->
 * EmployeesModule -> EmployeeCommissionsModule). If `EmployeeCommissionsModule`
 * imported `PaymentApprovalModule` directly, that closes the loop back onto
 * itself — and unlike the existing Users<->Employees cycle, a `forwardRef`
 * here would only defer *evaluating* the reference, not the eager
 * `import { PaymentApprovalModule } from ...` statement that every file in
 * that chain still carries. `EmployeeCommissionsModule` stays a leaf with no
 * outgoing imports; this sidecar module sits above both
 * `EmployeeCommissionsModule` and `PaymentApprovalModule` and is imported
 * only by `AppModule`, so it introduces no new edge into either module's
 * graph.
 */
@Module({
  imports: [EmployeeCommissionsModule, PaymentApprovalModule],
  controllers: [CommissionPayoutController],
  providers: [CommissionPayoutService],
})
export class CommissionPayoutModule {}
