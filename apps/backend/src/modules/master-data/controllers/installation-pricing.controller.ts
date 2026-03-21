import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateInstallationPricingDto,
  InstallationPricingResponseDto,
  UpdateInstallationPricingDto,
} from '../dto/installation-pricing';
import { InstallationPricingService } from '../services/installation-pricing.service';

@ApiTags('Installation Pricing')
@Controller('installation-pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class InstallationPricingController {
  constructor(private readonly installationPricingService: InstallationPricingService) {}

  @Post()
  @ApiCreate({
    summary: 'Create installation pricing tier',
    description:
      'Add a new installation pricing tier for a system size range. ' +
      'Each tier defines costs for a specific kW range (e.g. 5–10 KW).',
    responseType: InstallationPricingResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @Body() body: CreateInstallationPricingDto,
  ): Promise<InstallationPricingResponseDto> {
    const tier = await this.installationPricingService.create(organizationId, body);
    return plainToInstance(InstallationPricingResponseDto, tier, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all installation pricing tiers',
    description: 'Retrieve pricing tiers for the organisation, ordered by min system size.',
    responseType: InstallationPricingResponseDto,
    additionalQueries: [
      {
        name: 'isActive',
        required: false,
        type: Boolean,
        description: 'Filter by active status (true/false). Omit to return all.',
      },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search by kW size (numeric) or range',
      },
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      {
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per page (default: 20)',
      },
    ],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ): Promise<{
    data: InstallationPricingResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter = {
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      search,
      page,
      limit,
    };
    const result = await this.installationPricingService.findAll(organizationId, filter);
    return {
      data: plainToInstance(InstallationPricingResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get installation pricing tier by ID',
    description: 'Retrieve a specific installation pricing tier.',
    responseType: InstallationPricingResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstallationPricingResponseDto> {
    const tier = await this.installationPricingService.findById(id, organizationId);
    return plainToInstance(InstallationPricingResponseDto, tier, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update installation pricing tier',
    description:
      'Update an existing installation pricing tier. ' +
      'All fields are optional — only provided fields are updated.',
    responseType: InstallationPricingResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInstallationPricingDto,
  ): Promise<InstallationPricingResponseDto> {
    const tier = await this.installationPricingService.update(id, organizationId, body);
    return plainToInstance(InstallationPricingResponseDto, tier, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDelete({
    summary: 'Delete installation pricing tier',
    description: 'Permanently remove an installation pricing tier.',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.installationPricingService.delete(id, organizationId);
  }
}
