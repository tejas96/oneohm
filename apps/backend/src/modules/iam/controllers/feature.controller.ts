import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@oneohm-epc/shared-auth';

import { RequirePermission } from '../decorators/require-permission.decorator';
import { CreateFeatureDto } from '../dto/features/create-feature.dto';
import { UpdateFeatureDto } from '../dto/features/update-feature.dto';
import {
  FeatureResponseDto,
  FeatureWithPermissionsDto,
  PaginatedFeaturesDto,
} from '../dto/response';
import { PermissionGuard } from '../guards/permission.guard';
import { FeatureRepository } from '../repositories/feature.repository';
import { PermissionRepository } from '../repositories/permission.repository';

/**
 * Feature Controller - Admin UI for Feature Management
 * Full CRUD operations for features
 *
 * Security: All endpoints require IAM admin permissions
 */
@ApiTags('IAM - Features')
@ApiBearerAuth()
@Controller('iam/features')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FeatureController {
  constructor(
    private readonly featureRepository: FeatureRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  /**
   * Create a new feature
   */
  @Post()
  @RequirePermission('iam:features:create')
  @ApiOperation({ summary: 'Create a new feature', description: 'Creates a new feature/module' })
  async create(@Body() createFeatureDto: CreateFeatureDto): Promise<FeatureResponseDto> {
    const feature = await this.featureRepository.create(createFeatureDto);
    return feature;
  }

  /**
   * Get all features (paginated)
   */
  @Get()
  @RequirePermission('iam:features:read')
  @ApiOperation({ summary: 'List all features', description: 'Get paginated list of features' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('active') active?: boolean,
  ): Promise<PaginatedFeaturesDto> {
    const skip = (page - 1) * pageSize;

    let features: any[];
    let total: number;

    if (active !== undefined) {
      [features, total] = await this.featureRepository.findActivePaginated(skip, pageSize);
    } else {
      [features, total] = await this.featureRepository.findAllPaginated(skip, pageSize);
    }

    return {
      data: features,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get feature by ID with permissions
   */
  @Get(':id')
  @RequirePermission('iam:features:read')
  @ApiOperation({
    summary: 'Get feature details',
    description: 'Get feature by ID with its permissions',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FeatureWithPermissionsDto> {
    const feature = await this.featureRepository.findOne({ where: { id } });

    if (!feature) {
      throw new Error('Feature not found');
    }

    // Get permissions for this feature
    const permissions = await this.permissionRepository.findByFeatureId(id);

    return {
      ...feature,
      permissions: permissions.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        action: p.action,
        scope: p.scope,
      })),
    };
  }

  /**
   * Update feature
   */
  @Patch(':id')
  @RequirePermission('iam:features:update')
  @ApiOperation({ summary: 'Update feature', description: 'Update feature details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFeatureDto: UpdateFeatureDto,
  ): Promise<FeatureResponseDto> {
    await this.featureRepository.update(id, updateFeatureDto);

    const feature = await this.featureRepository.findOne({ where: { id } });

    if (!feature) {
      throw new Error('Feature not found after update');
    }

    return feature;
  }

  /**
   * Delete feature
   */
  @Delete(':id')
  @RequirePermission('iam:features:delete')
  @ApiOperation({
    summary: 'Delete feature',
    description: 'Delete a feature (system features cannot be deleted)',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const feature = await this.featureRepository.findOne({ where: { id } });

    if (!feature) {
      throw new Error('Feature not found');
    }

    if (feature.isSystemFeature) {
      throw new Error('Cannot delete system feature');
    }

    await this.featureRepository.delete(id);
    return { message: 'Feature deleted successfully' };
  }

  /**
   * Get feature by code
   */
  @Get('by-code/:code')
  @RequirePermission('iam:features:read')
  @ApiOperation({ summary: 'Get feature by code', description: 'Get feature details by code' })
  async findByCode(@Param('code') code: string): Promise<FeatureWithPermissionsDto> {
    const feature = await this.featureRepository.findByCode(code);

    if (!feature) {
      throw new Error('Feature not found');
    }

    // Get permissions for this feature
    const permissions = await this.permissionRepository.findByFeatureId(feature.id);

    return {
      ...feature,
      permissions: permissions.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        action: p.action,
        scope: p.scope,
      })),
    };
  }
}

