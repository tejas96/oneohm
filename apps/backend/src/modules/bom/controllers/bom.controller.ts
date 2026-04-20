import {
  BadRequestException,
  Controller,
  Get,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { BomResponseDto } from '../dto/bom-response.dto';
import { BomService } from '../services/bom.service';

const ALLOWED_ENTITY_TYPES = ['quote_version', 'project'] as const;

@Controller('bom')
@UseGuards(JwtAuthGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get()
  async findByEntity(
    @OrganizationContext() organizationId: string,
    @Query('entityType') entityType: string,
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<BomResponseDto | { data: null }> {
    if (
      !entityType ||
      !ALLOWED_ENTITY_TYPES.includes(entityType as (typeof ALLOWED_ENTITY_TYPES)[number])
    ) {
      throw new BadRequestException(
        `entityType must be one of: ${ALLOWED_ENTITY_TYPES.join(', ')}`,
      );
    }

    const bom = await this.bomService.findByEntity(organizationId, entityType, entityId);
    return bom ?? { data: null };
  }
}
