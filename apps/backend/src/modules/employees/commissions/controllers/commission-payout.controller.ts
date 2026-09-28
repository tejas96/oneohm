import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import { RecordCommissionPaymentDto } from '../dto';
import { CommissionPayoutService } from '../services/commission-payout.service';
import type { CommissionRow } from '../sql/commission-read.sql';

/**
 * Lives apart from `EmployeeCommissionController` (same `/commissions` path)
 * because `CommissionPayoutService` needs `PaymentApprovalService`, and
 * wiring that into `EmployeeCommissionsModule` would close an import cycle —
 * see the comment on `CommissionPayoutService` for the traced graph.
 */
@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionPayoutController {
  constructor(private readonly payouts: CommissionPayoutService) {}

  @Post('record-payment')
  recordPayment(@Body() dto: RecordCommissionPaymentDto, @CurrentUser() user: CurrentUserType): Promise<CommissionRow[]> {
    return this.payouts.recordPayment(dto, user);
  }
}
