import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import { RecordCommissionPaymentDto } from '../dto';
import { CommissionPayoutService } from '../services/commission-payout.service';
import type { CommissionRow } from '../sql/commission-read.sql';

/** Apart from `EmployeeCommissionController` to avoid an import cycle; see commission-payout.module.ts. */
@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionPayoutController {
  constructor(private readonly payouts: CommissionPayoutService) {}

  @Post('record-payment')
  recordPayment(
    @Body() dto: RecordCommissionPaymentDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow[]> {
    return this.payouts.recordPayment(dto, user);
  }
}
