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
import { type ExtendedStatisticsResponse, VendorStatus, VendorType } from '@tejas96/shared/types';
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
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import { CreateVendorDto, UpdateVendorDto, VendorResponseDto } from '../dto';
import { VendorService } from '../services';

/**
 * Vendor Controller
 * Handles HTTP requests for vendor management
 */
@ApiTags('Inventory - Vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Get vendor statistics — MUST be before :id
   */
  @RequirePermission('inventory:read')
  @Get('stats/summary')
  @ApiOperation({ summary: 'Get vendor statistics' })
  async getStatistics(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<ExtendedStatisticsResponse<VendorStatus, VendorType>> {
    return this.vendorService.getStatistics();
  }

  /**
   * Create a new vendor
   */
  @RequirePermission('inventory:write')
  @Post()
  @ApiCreate({
    summary: 'Create a new vendor',
    description: 'Creates a new vendor/supplier',
    responseType: VendorResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateVendorDto,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.create(createDto, currentUser.id);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all vendors with filters
   */
  @RequirePermission('inventory:read')
  @Get()
  @ApiReadAll({
    summary: 'Get all vendors',
    description: 'Retrieve all vendors with optional filters and pagination',
    responseType: VendorResponseDto,
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
    enum: Object.values(VendorStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'vendorType',
    required: false,
    enum: Object.values(VendorType),
    description: 'Filter by vendor type',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, code, or contact person',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: Record<string, string>,
    @Query('status') status?: VendorStatus,
    @Query('vendorType') vendorType?: VendorType,
    @Query('search') search?: string,
  ): Promise<{
    data: VendorResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(query.page, query.limit);
    const { vendors, total } = await this.vendorService.findAll(pageNum, limitNum, {
      status,
      vendorType,
      search,
    });

    return {
      data: plainToInstance(VendorResponseDto, vendors, {
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
   * Get vendor by ID
   */
  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiReadOne({
    summary: 'Get vendor by ID',
    description: 'Retrieve a specific vendor by its ID',
    responseType: VendorResponseDto,
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.findById(id);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update vendor
   */
  @RequirePermission('inventory:write')
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update vendor',
    description: 'Update an existing vendor',
    responseType: VendorResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVendorDto,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.update(id, updateDto, currentUser.id);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete vendor
   */
  @RequirePermission('inventory:write')
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete vendor',
    description: 'Soft delete a vendor',
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.vendorService.delete(id, currentUser.id);

    return { message: 'Vendor deleted successfully' };
  }

  /**
   * Change vendor status
   */
  @RequirePermission('inventory:write')
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change vendor status',
    description: 'Update the status of a vendor',
  })
  async changeStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: VendorStatus,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.changeStatus(id, status, currentUser.id);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update vendor rating
   */
  @RequirePermission('inventory:write')
  @Patch(':id/rating')
  @ApiOperation({
    summary: 'Update vendor rating',
    description: 'Update the rating of a vendor (0-5)',
  })
  async updateRating(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('rating') rating: number,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.updateRating(id, rating);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }
}
