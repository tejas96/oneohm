import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type StatisticsResponse, WarehouseStatus, WarehouseType } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseResponseDto } from '../dto';
import { WarehouseService } from '../services';

/**
 * Warehouse Controller
 * IMPORTANT: Static sub-paths (stats/summary) are declared BEFORE :id routes.
 */
@ApiTags('Inventory - Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  /**
   * Get warehouse statistics — MUST be before :id
   */
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get warehouse statistics' })
  async getStatistics(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<StatisticsResponse<WarehouseStatus>> {
    return this.warehouseService.getStatistics();
  }

  /**
   * Create a new warehouse
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new warehouse',
    description: 'Creates a new warehouse/storage location',
    responseType: WarehouseResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.create(createDto, currentUser.id);

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all warehouses with filters
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all warehouses',
    description: 'Retrieve all warehouses with optional filters and pagination',
    responseType: WarehouseResponseDto,
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
    @Query() query: Record<string, string>,
    @Query('status') status?: WarehouseStatus,
    @Query('warehouseType') warehouseType?: WarehouseType,
    @Query('warehouseManagerId') warehouseManagerId?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: WarehouseResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const { warehouses, total } = await this.warehouseService.findAll(pageNum, limitNum, {
      status,
      warehouseType,
      warehouseManagerId,
      search,
    });

    return {
      data: plainToInstance(WarehouseResponseDto, warehouses, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get warehouse by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get warehouse by ID',
    description: 'Retrieve a specific warehouse by its ID',
    responseType: WarehouseResponseDto,
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.findById(id);

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update warehouse
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update warehouse',
    description: 'Update an existing warehouse',
    responseType: WarehouseResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.update(id, updateDto, currentUser.id);

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete warehouse
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete warehouse',
    description: 'Soft delete a warehouse',
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.warehouseService.delete(id, currentUser.id);

    return { message: 'Warehouse deleted successfully' };
  }

  /**
   * Change warehouse status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change warehouse status',
    description: 'Update the status of a warehouse',
  })
  async changeStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', new ParseEnumPipe(WarehouseStatus)) status: WarehouseStatus,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseService.changeStatus(id, status, currentUser.id);

    return plainToInstance(WarehouseResponseDto, warehouse, {
      excludeExtraneousValues: true,
    });
  }
}
