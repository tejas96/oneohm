import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import { InventorySearchQueryDto } from '../dto';
import {
  InventorySearchService,
  type InventorySearchResponse,
} from '../services/inventory-search.service';

/**
 * Federated search across inventory resources. Powers the Cmd+K palette
 * "Inventory" group on the frontend. See InventorySearchService for the
 * design contract (per-bucket limit, timeout, degraded behavior).
 */
@ApiTags('Inventory - Search')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventorySearchController {
  constructor(private readonly inventorySearchService: InventorySearchService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Federated inventory search',
    description:
      'Searches products, vendors, warehouses, purchase orders, and material dispatches in parallel. Per-bucket limit 8, per-bucket timeout 2s. Failed/timed-out buckets appear in `degraded` and return empty hits.',
  })
  async search(@Query() query: InventorySearchQueryDto): Promise<InventorySearchResponse> {
    return this.inventorySearchService.search(query.q, query.types ?? []);
  }
}
