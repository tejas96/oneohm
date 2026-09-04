import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { BomAllocationService } from '../../inventory/services/bom-allocation.service';
import { BomReadService, ProcurementStatus } from '../services/bom-read.service';

/**
 * What is left of the BOM-id-addressed surface: the two operations that are
 * genuinely about a BOM rather than about a project's bill of materials.
 *
 * `GET /bom?entityType=project&entityId=...` is gone. It looked a BOM up by a
 * polymorphic column pair that has been NULL on every BOM written since Task
 * 11, and `GET /projects/:projectId/bom` replaces it with the foreign key that
 * actually exists.
 */
@ApiTags('BOM')
@ApiBearerAuth()
@Controller('bom')
@UseGuards(JwtAuthGuard)
export class BomController {
  constructor(
    private readonly bomReadService: BomReadService,
    private readonly bomAllocationService: BomAllocationService,
  ) {}

  /**
   * Procurement status for a project — per-product target vs spent
   * derived from `expense_product_links`. Powers the "Procurement"
   * section of the project's BOM tab (plan §3.4 / §6).
   */
  @Get('project/:projectId/procurement-status')
  @ApiOperation({
    summary: 'Per-product procurement status for a project (BOM target vs spent qty)',
  })
  async getProcurementStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProcurementStatus> {
    return this.bomReadService.getProcurementStatus(projectId);
  }

  /**
   * Reserve stock for all pending BOM product lines.
   *
   * Reads warehouse from project.defaultWarehouseId — no body required.
   * Partial allocation is normal; items without sufficient stock are returned
   * in the `pendingStock` array.  Idempotent: already-satisfied lines are skipped.
   */
  @Post(':id/allocate-pending')
  @ApiOperation({
    summary: 'Reserve stock for pending BOM lines',
    description:
      'Partially or fully reserves stock from the project default warehouse. Idempotent.',
  })
  async allocatePending(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bomAllocationService.allocatePending(id, currentUser.id);
  }
}
