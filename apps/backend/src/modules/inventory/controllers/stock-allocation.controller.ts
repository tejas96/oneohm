import {
  Body,
  Controller,
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
import { StockAllocationStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import {
  CreateStockAllocationDto,
  FulfillStockAllocationDto,
  StockAllocationResponseDto,
  UpdateStockAllocationDto,
} from '../dto';
import { StockAllocationService } from '../services';

/**
 * Stock Allocation Controller
 * Handles HTTP requests for stock allocation to projects
 */
@ApiTags('Inventory - Stock Allocations')
@ApiBearerAuth()
@Controller('stock-allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockAllocationController {
  constructor(private readonly stockAllocationService: StockAllocationService) {}

  /**
   * Create a new stock allocation
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiCreate({
    summary: 'Create a stock allocation',
    description: 'Allocate stock to a project (reserves inventory)',
    responseType: StockAllocationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all stock allocations with filters
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadAll({
    summary: 'Get all stock allocations',
    description: 'Retrieve all stock allocations with optional filters and pagination',
    responseType: StockAllocationResponseDto,
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
    enum: Object.values(StockAllocationStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project',
  })
  @ApiQuery({
    name: 'warehouseId',
    required: false,
    type: String,
    description: 'Filter by warehouse',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: StockAllocationStatus,
    @Query('projectId') projectId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ): Promise<{
    data: StockAllocationResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { allocations, total } = await this.stockAllocationService.findAll(
      currentUser.organizationId,
      page,
      limit,
      {
        status,
        projectId,
        warehouseId,
        productId,
      },
    );

    return {
      data: plainToInstance(StockAllocationResponseDto, allocations, {
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
   * Get stock allocation by ID
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiReadOne({
    summary: 'Get stock allocation by ID',
    description: 'Retrieve a specific stock allocation by its ID',
    responseType: StockAllocationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.findById(
      id,
      currentUser.organizationId,
    );

    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get allocations by project
   */
  @Get('project/:projectId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER, Role.EXECUTION_ENGINEER)
  @ApiOperation({
    summary: 'Get allocations by project',
    description: 'Retrieve all stock allocations for a specific project',
  })
  async findByProject(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<StockAllocationResponseDto[]> {
    const allocations = await this.stockAllocationService.findByProject(projectId);

    return plainToInstance(StockAllocationResponseDto, allocations, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update stock allocation
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({
    summary: 'Update stock allocation',
    description: 'Update an existing stock allocation',
    responseType: StockAllocationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Fulfill stock allocation
   */
  @Post(':id/fulfill')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FIELD_WORKER)
  @ApiOperation({
    summary: 'Fulfill stock allocation',
    description: 'Fulfill allocated stock (full or partial)',
  })
  async fulfill(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() fulfillDto: FulfillStockAllocationDto,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.fulfill(
      id,
      currentUser.organizationId,
      fulfillDto,
      currentUser.id,
    );

    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Cancel stock allocation
   */
  @Post(':id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Cancel stock allocation',
    description: 'Cancel a stock allocation (releases reserved stock)',
  })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<StockAllocationResponseDto> {
    const allocation = await this.stockAllocationService.cancel(
      id,
      currentUser.organizationId,
      reason,
      currentUser.id,
    );

    return plainToInstance(StockAllocationResponseDto, allocation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get stock allocation statistics
   */
  @Get('stats/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get stock allocation statistics',
    description: 'Get allocation count by status',
  })
  async getStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<{
    total: number;
    byStatus: Record<StockAllocationStatus, number>;
  }> {
    return this.stockAllocationService.getStatistics(currentUser.organizationId);
  }

  /**
   * Get pending allocations
   */
  @Get('pending/list')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Get pending allocations',
    description: 'Get list of allocations not yet fulfilled',
  })
  async getPending(@CurrentUser() currentUser: CurrentUserType): Promise<StockAllocationResponseDto[]> {
    const allocations = await this.stockAllocationService.getPendingAllocations(
      currentUser.organizationId,
    );

    return plainToInstance(StockAllocationResponseDto, allocations, {
      excludeExtraneousValues: true,
    });
  }
}

