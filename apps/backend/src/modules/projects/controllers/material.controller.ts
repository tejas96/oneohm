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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MaterialStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateMaterialDto, MaterialResponseDto, UpdateMaterialDto } from '../dto';
import { MaterialService } from '../services/material.service';

/**
 * Material Controller
 * Handles HTTP requests for project material management
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects/:projectId/materials')
@UseGuards(JwtAuthGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  /**
   * Create a new material entry
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new material entry',
    description: 'Add a material requirement to the project',
    responseType: MaterialResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateMaterialDto,
  ): Promise<MaterialResponseDto> {
    // Ensure projectId in path matches DTO
    createDto.projectId = projectId;

    const material = await this.materialService.create(organizationId, createDto);

    return plainToInstance(MaterialResponseDto, material, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all materials for a project
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all materials',
    description: 'Retrieve all materials for a project',
    responseType: MaterialResponseDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(MaterialStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product ID',
  })
  async findByProject(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: MaterialStatus,
    @Query('category') category?: string,
    @Query('productId') productId?: string,
  ): Promise<MaterialResponseDto[]> {
    const materials = await this.materialService.findByProject(projectId, organizationId, {
      status,
      category,
      productId,
    });

    return plainToInstance(MaterialResponseDto, materials, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get material by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get material by ID',
    description: 'Retrieve a single material with details',
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialService.findById(id, projectId, organizationId);

    return plainToInstance(MaterialResponseDto, material, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update a material
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update a material',
    description: 'Update material details and quantities',
    responseType: MaterialResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialService.update(id, projectId, organizationId, updateDto);

    return plainToInstance(MaterialResponseDto, material, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a material
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete a material',
    description: 'Delete a material (only required/ordered)',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.materialService.delete(id, projectId, organizationId);
    return { message: 'Material deleted successfully' };
  }

  /**
   * Update material status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update material status',
    description: 'Change material status with auto-date updates',
  })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: Object.values(MaterialStatus),
    description: 'New status',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: MaterialStatus,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialService.updateStatus(id, projectId, organizationId, status);

    return plainToInstance(MaterialResponseDto, material, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update material quantities
   */
  @Patch(':id/quantities')
  @ApiOperation({
    summary: 'Update material quantities',
    description: 'Update allocated or used quantities',
  })
  @ApiQuery({
    name: 'quantityAllocated',
    required: false,
    type: Number,
    description: 'Allocated quantity',
  })
  @ApiQuery({
    name: 'quantityUsed',
    required: false,
    type: Number,
    description: 'Used quantity',
  })
  async updateQuantities(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('quantityAllocated') quantityAllocated?: string,
    @Query('quantityUsed') quantityUsed?: string,
  ): Promise<MaterialResponseDto> {
    const material = await this.materialService.updateQuantities(id, projectId, organizationId, {
      quantityAllocated: quantityAllocated ? parseFloat(quantityAllocated) : undefined,
      quantityUsed: quantityUsed ? parseFloat(quantityUsed) : undefined,
    });

    return plainToInstance(MaterialResponseDto, material, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get material statistics
   */
  @Get('statistics/summary')
  @ApiOperation({
    summary: 'Get material statistics',
    description: 'Get comprehensive material statistics for the project',
  })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{
    totalMaterials: number;
    requiredCount: number;
    orderedCount: number;
    allocatedCount: number;
    usedCount: number;
    totalCost: number;
  }> {
    return this.materialService.getStatistics(projectId, organizationId);
  }
}
