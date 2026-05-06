import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import { BomResponseDto } from '../dto/bom-response.dto';
import { BomService } from '../services/bom.service';

const ALLOWED_ENTITY_TYPES = ['quote_version', 'project'] as const;

@ApiTags('BOM')
@ApiBearerAuth()
@Controller('bom')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @RequirePermission('bom:read')
  @Get()
  async findByEntity(
    @OrganizationContext() organizationId: string,
    @Query('entityType') entityType: string,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<BomResponseDto | null> {
    if (
      !entityType ||
      !ALLOWED_ENTITY_TYPES.includes(entityType as (typeof ALLOWED_ENTITY_TYPES)[number])
    ) {
      throw new BadRequestException(
        `entityType must be one of: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      );
    }

    const bom = await this.bomService.findByEntity(organizationId, entityType, entityId);
    return bom;
  }

  /**
   * Procurement status for a project — per-product target vs spent
   * derived from `expense_product_links`. Powers the "Procurement"
   * section of the project's BOM tab (plan §3.4 / §6).
   */
  @RequirePermission('bom:read')
  @Get('project/:projectId/procurement-status')
  @ApiOperation({
    summary:
      'Per-product procurement status for a project (BOM target vs spent qty)',
  })
  async getProcurementStatus(
    @OrganizationContext() organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ReturnType<BomService['getProcurementStatus']>> {
    return this.bomService.getProcurementStatus(projectId, organizationId);
  }

  /**
   * Finalize BOM and auto-create stock allocations for all product line items.
   * Idempotent: calling twice returns existing allocations without duplicating.
   */
  @RequirePermission('bom:finalize')
  @Post(':id/finalize-and-allocate')
  @ApiOperation({
    summary: 'Finalize BOM and auto-allocate stock',
    description: 'Creates stock allocations for each BOM product item. Idempotent.',
  })
  async finalizeAndAllocate(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('warehouseId') warehouseId: string,
  ) {
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    return this.bomService.finalizeAndAllocate(organizationId, id, warehouseId, currentUser.id);
  }
}
