import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ResellerAllowed, ResellerScope } from '../../../../common/reseller';
import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import { CloseRecoveryDto, CommissionListQueryDto, EditCommissionDto, ReasonDto, ResellerPeriodQueryDto } from '../dto';
import { CommissionActionsService } from '../services/commission-actions.service';
import { ResellerDashboardService } from '../services/reseller-dashboard.service';
import type { CommissionRow } from '../sql/commission-read.sql';
import { requirePermission } from '../utils/require-permission';

/**
 * A commission row as its reseller sees it: office-only text (notes, the
 * rejection and recovery notes, a Fix-strip dismissal) never reaches him.
 */
function forReseller(
  row: CommissionRow,
): Omit<CommissionRow, 'notes' | 'payoutRejectedReason' | 'recoveryNotes'> {
  const { notes, payoutRejectedReason, recoveryNotes, ...rest } = row;
  void notes;
  void payoutRejectedReason;
  void recoveryNotes;
  return {
    ...rest,
    cancelReason: rest.cancelReason?.startsWith('Dismissed:') ? null : rest.cancelReason,
  };
}

/**
 * Commissions, office side. There is no create, no delete and no "set status":
 * a commission is born from an accepted quote, dies by cancel, and reaches
 * `paid` only through the approval queue (spec §6.2, §7.5).
 */
@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class EmployeeCommissionController {
  constructor(
    private readonly actions: CommissionActionsService,
    private readonly dashboard: ResellerDashboardService,
  ) {}

  /** The reseller's own dashboard. */
  @ResellerAllowed()
  @Get('me')
  async me(@Query() q: ResellerPeriodQueryDto, @ResellerScope() resellerId?: string) {
    if (!resellerId) throw new NotFoundException('Only resellers have commissions');
    const detail = await this.dashboard.detail(resellerId, q.period);
    return { ...detail, commissions: detail.commissions.map(forReseller) };
  }

  @Get()
  list(@Query() query: CommissionListQueryDto, @CurrentUser() user: CurrentUserType): Promise<CommissionRow[]> {
    requirePermission(user, 'finance.view');
    return this.actions.list(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.view');
    return this.actions.getOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserType): Promise<CommissionRow> {
    return this.actions.approve(id, user);
  }

  @Patch(':id')
  edit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditCommissionDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow> {
    return this.actions.edit(id, dto, user);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow> {
    return this.actions.cancel(id, dto.reason, user);
  }

  @Post(':id/close-recovery')
  closeRecovery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseRecoveryDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CommissionRow> {
    return this.actions.closeRecovery(id, dto, user);
  }
}
