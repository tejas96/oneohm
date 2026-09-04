import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  AddBomItemDto,
  ChangeBomQuantityDto,
  RemoveBomItemDto,
  ReplaceBomItemDto,
} from '../dto/bom-edit.dto';
import { BomEditService } from '../services/bom-edit.service';

/**
 * The four BOM edit operations over HTTP.
 *
 * Every route here carries a mandatory `reason`, which is why removal is a
 * POST rather than a DELETE: nothing is deleted (the line is set to quantity
 * 0 so a removed quoted line stays visible and stock_allocations.bom_id
 * cannot dangle), and a DELETE body is not reliably transmitted by every
 * client.
 *
 * `source` is not exposed on the wire. Everything arriving through HTTP is a
 * site edit and takes the service default; Task 15's applyRebaseline is the
 * only caller that passes 'office', and it calls the service directly.
 *
 * Task 16 owns the final BOM routing surface (it replaces GET /bom and moves
 * getProcurementStatus onto BomReadService). These four routes exist now
 * because Task 14's operations are otherwise unreachable from outside the
 * process, and its verification has to exercise them end to end.
 */
@ApiTags('BOM')
@ApiBearerAuth()
@Controller('projects/:projectId/bom')
@UseGuards(JwtAuthGuard)
export class BomEditController {
  constructor(private readonly bomEditService: BomEditService) {}

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the project BOM' })
  async addItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: AddBomItemDto,
  ): Promise<{ itemId: string; costImpactPaise: number }> {
    return this.bomEditService.addItem(projectId, dto, currentUser.id);
  }

  @Patch('items/:itemId/quantity')
  @ApiOperation({ summary: 'Change how much of a BOM line the project needs' })
  async changeQuantity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: ChangeBomQuantityDto,
  ): Promise<{ costImpactPaise: number }> {
    return this.bomEditService.changeQuantity(projectId, itemId, dto, currentUser.id);
  }

  @Post('items/:itemId/replace')
  @ApiOperation({ summary: 'Swap a BOM line for a different product, keeping the quantity' })
  async replaceItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: ReplaceBomItemDto,
  ): Promise<{ newItemId: string; costImpactPaise: number }> {
    return this.bomEditService.replaceItem(projectId, itemId, dto, currentUser.id);
  }

  @Post('items/:itemId/remove')
  @ApiOperation({ summary: 'Take a line off the BOM (kept at quantity 0, never deleted)' })
  async removeItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: RemoveBomItemDto,
  ): Promise<{ costImpactPaise: number }> {
    return this.bomEditService.removeItem(projectId, itemId, dto, currentUser.id);
  }
}
