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
import { SetBomItemSerialsDto } from '../dto/set-bom-item-serials.dto';
import { BomSerialService } from '../services/bom-serial.service';

const SERIAL_EDITOR_ROLES = new Set(['admin', 'manager', 'field_worker']);

/**
 * Serial numbers, addressed by the BOM line they belong to.
 *
 * One route replaces two: `PATCH :id/serial` set a single serial on a single
 * bom_items row, and `PATCH bulk-serials` did that for several rows at once.
 * Both existed only because a serialized line was exploded into one row per
 * unit. Setting the whole list for one line covers every case either did, and
 * is idempotent as neither was.
 *
 * NOT under `projects/:projectId/bom` on purpose: the mobile scanner has an
 * item id in hand and no project id, and making it fetch one first would put a
 * round trip between scanning a panel and recording it.
 */
@ApiTags('BOM Items')
@ApiBearerAuth()
@Controller('bom-items')
@UseGuards(JwtAuthGuard)
export class BomItemsController {
  constructor(private readonly bomSerialService: BomSerialService) {}

  @Patch(':itemId/serials')
  @ApiOperation({ summary: 'Set the whole serial-number list for one BOM line' })
  async setSerials(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SetBomItemSerialsDto,
  ) {
    this.assertSerialEditRole(currentUser);
    const serials = await this.bomSerialService.setSerials(itemId, dto.serials, currentUser.id);
    return { data: serials.map((s) => ({ id: s.id, serialNumber: s.serialNumber })) };
  }

  @Get('check-serial')
  @ApiOperation({ summary: 'Find where else this serial number is already recorded' })
  async checkSerial(@Query('serialNumber') serialNumber: string) {
    const normalized = serialNumber?.trim();
    if (!normalized) {
      throw new BadRequestException('serialNumber is required');
    }
    const conflicts = await this.bomSerialService.findConflicts(normalized);
    return { data: conflicts };
  }

  /**
   * field_worker is in this set deliberately — recording a panel's serial as
   * it goes on the roof is the field worker's job, and the mobile screen that
   * does it has no other role to offer.
   */
  private assertSerialEditRole(currentUser: CurrentUserType): void {
    const roles = currentUser.roles ?? [];
    const hasAllowedRole = roles.some((role) => SERIAL_EDITOR_ROLES.has(role));
    if (!hasAllowedRole) {
      throw new ForbiddenException('Only admin, manager, or field_worker can edit serial numbers');
    }
  }
}
