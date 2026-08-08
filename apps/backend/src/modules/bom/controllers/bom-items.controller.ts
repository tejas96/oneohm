import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  BulkUpdateBomItemSerialsDto,
  UpdateBomItemSerialDto,
} from '../dto/update-bom-item-serial.dto';
import { BomService } from '../services/bom.service';

const SERIAL_EDITOR_ROLES = new Set(['admin', 'manager', 'field_worker']);

@ApiTags('BOM Items')
@ApiBearerAuth()
@Controller('bom-items')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BomItemsController {
  constructor(private readonly bomService: BomService) {}

  @RequirePermission('bom:finalize')
  @Patch(':id/serial')
  @ApiOperation({ summary: 'Update serial number for a BOM unit item' })
  async updateSerial(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBomItemSerialDto,
  ) {
    this.assertSerialEditRole(currentUser);
    const item = await this.bomService.updateItemSerial(id, dto.serialNumber);
    return { data: item };
  }

  @RequirePermission('bom:finalize')
  @Patch('bulk-serials')
  @ApiOperation({ summary: 'Bulk update serial numbers for BOM unit items' })
  async bulkUpdateSerials(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: BulkUpdateBomItemSerialsDto,
  ) {
    this.assertSerialEditRole(currentUser);
    const items = await this.bomService.bulkUpdateItemSerials(dto.items);
    return { data: items };
  }

  @RequirePermission('bom:read')
  @Get('check-serial')
  @ApiOperation({ summary: 'Find serial conflicts in current organization BOMs' })
  async checkSerial(@Query('serialNumber') serialNumber: string) {
    const normalized = serialNumber?.trim();
    if (!normalized) {
      throw new BadRequestException('serialNumber is required');
    }
    const conflicts = await this.bomService.findSerialConflicts(normalized);
    return { data: conflicts };
  }

  private assertSerialEditRole(currentUser: CurrentUserType): void {
    const roles = currentUser.roles ?? [];
    const hasAllowedRole = roles.some((role) => SERIAL_EDITOR_ROLES.has(role));
    if (!hasAllowedRole) {
      throw new ForbiddenException('Only admin, manager, or field_worker can edit serial numbers');
    }
  }
}
