import {
  Body, ConflictException, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import { DismissMissingDto, ResellerPeriodQueryDto } from '../dto';
import { CommissionBirthService } from '../services/commission-birth.service';
import { ResellerDashboardService } from '../services/reseller-dashboard.service';
import { requirePermission } from '../utils/require-permission';

@ApiTags('Resellers')
@ApiBearerAuth()
@Controller('resellers')
@UseGuards(JwtAuthGuard)
export class ResellerDashboardController {
  constructor(
    private readonly dashboard: ResellerDashboardService,
    private readonly birth: CommissionBirthService,
  ) {}

  @Get()
  list(@Query() q: ResellerPeriodQueryDto, @CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.view');
    return this.dashboard.list(q.period);
  }

  @Get('missing-commissions')
  missing(@CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.view');
    return this.dashboard.missing();
  }

  @Post('missing-commissions/:quoteId/create')
  async createMissing(@Param('quoteId', ParseUUIDPipe) quoteId: string, @CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.payments.record');
    const id = await this.birth.createForAcceptedQuote(quoteId, user.id);
    if (!id) throw new ConflictException('This quote already has a commission, or no longer earns one.');
    return { id };
  }

  @Post('missing-commissions/:quoteId/dismiss')
  async dismissMissing(
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() dto: DismissMissingDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    requirePermission(user, 'finance.payments.record');
    const id = await this.birth.dismissMissing(quoteId, dto.note, user.id);
    if (!id) throw new ConflictException('This quote already has a commission, or no longer earns one.');
    return { id };
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Query() q: ResellerPeriodQueryDto, @CurrentUser() user: CurrentUserType) {
    requirePermission(user, 'finance.view');
    return this.dashboard.detail(id, q.period);
  }
}
