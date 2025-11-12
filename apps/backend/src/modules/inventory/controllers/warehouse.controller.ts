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
import {
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { type StatisticsResponse, WarehouseStatus, WarehouseType } from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseResponseDto } from '../dto';
import { WarehouseService } from '../services';

/**
 * Warehouse Controller
 * Handles HTTP requests for warehouse management
 */
@ApiTags('Inventory - Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  /**
   * Create a new warehouse
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiCreate({
    summary: 'Create a new warehouse',
    description: 'Creates a new warehouse/storage location',
    responseType: WarehouseResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all warehouses with filters
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadAll({
    summary: 'Get all warehouses',
    description: 'Retrieve all warehouses with optional filters and pagination',
    responseType: WarehouseResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(WarehouseStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'warehouseType',
    required: false,
    enum: Object.values(WarehouseType),
    description: 'Filter by warehouse type',
  })
  @ApiQuery({
    name: 'warehouseManagerId',
    required: false,
    type: String,
    description: 'Filter by warehouse manager',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, code, or city',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: WarehouseStatus,
    @Query('warehouseType') warehouseType?: WarehouseType,
    @Query('warehouseManagerId') warehouseManagerId?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: WarehouseResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { warehouses, total } = await this.warehouseService.findAll(
      currentUser.organizationId,
      page,
      limit,
      {
        status,
        warehouseType,
        warehouseManagerId,
        search,
      },
    );

    return {
      data: plainToInstance(WarehouseResponseDto, warehouses, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: page ?? 1,
        limit: limit ?? 20,
        total,
        totalPages: Math.ceil(total / (limit ?? 20)),
      },
    };
  }

  /**
   * Get warehouse by ID
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadOne({
    summary: 'Get warehouse by ID',
    description: 'Retrieve a specific warehouse by its ID',
    responseType: WarehouseResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.findById(id, currentUser.organizationId);

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update warehouse
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({
    summary: 'Update warehouse',
    description: 'Update an existing warehouse',
    responseType: WarehouseResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete warehouse
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiDelete({
    summary: 'Delete warehouse',
    description: 'Soft delete a warehouse',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.warehouseService.delete(id, currentUser.organizationId, currentUser.id);

    return { message: 'Warehouse deleted successfully' };
  }

  /**
   * Get warehouse statistics
   */
  @Get('stats/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get warehouse statistics',
    description: 'Get warehouse count by status',
  })
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<StatisticsResponse<WarehouseStatus>> {
    return this.warehouseService.getStatistics(currentUser.organizationId);
  }

  /**
   * Change warehouse status
   */
  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Change warehouse status',
    description: 'Update the status of a warehouse',
  })
  async changeStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: WarehouseStatus,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.changeStatus(
      id,
      currentUser.organizationId,
      status,
      currentUser.id,
    );

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }
}
