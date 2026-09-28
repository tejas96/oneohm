import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import { CloseRecoveryDto, CommissionListQueryDto, EditCommissionDto, ReasonDto } from '../dto';
import { CommissionActionsService } from '../services/commission-actions.service';
import type { CommissionRow } from '../sql/commission-read.sql';
import { requirePermission } from '../utils/require-permission';

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
  constructor(private readonly actions: CommissionActionsService) {}

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
