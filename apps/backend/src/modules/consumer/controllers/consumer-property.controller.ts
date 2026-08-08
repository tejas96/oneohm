import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CustomerPropertyService } from '../../customers/services/customer-property.service';
import { CustomerPropertyResponseDto } from '../dto';
import { CustomerOwnershipGuard } from '../guards';

/**
 * Consumer Property Controller
 * Customer-safe endpoints under /consumer/* — guarded by JwtAuthGuard + CustomerOwnershipGuard.
 */
@ApiTags('Consumer')
@ApiBearerAuth()
@Controller('consumer')
@UseGuards(JwtAuthGuard, CustomerOwnershipGuard)
export class ConsumerPropertyController {
  constructor(private readonly propertyService: CustomerPropertyService) {}

  /**
   * List properties for the logged-in customer (quotes + project eager-loaded).
   */
  @Get('properties')
  @ApiOperation({
    summary: 'Get properties for the logged-in customer',
    description:
      'Returns all active properties for the authenticated customer context, ' +
      'including quotes (with versions) and project details.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of customer properties',
    type: [CustomerPropertyResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No customer profile or not authorized',
  })
  async findProperties(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto[]> {
    const properties = await this.propertyService.findMyProperties(currentUser.id);
    return toDtoArray(CustomerPropertyResponseDto, properties);
  }
}
