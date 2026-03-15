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
  type ExtendedStatisticsResponse,
  VendorStatus,
  VendorType,
} from '@oneohm-epc/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateVendorDto, UpdateVendorDto, VendorResponseDto } from '../dto';
import { VendorService } from '../services';

/**
 * Vendor Controller
 * Handles HTTP requests for vendor management
 */
@ApiTags('Inventory - Vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  /**
   * Create a new vendor
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new vendor',
    description: 'Creates a new vendor/supplier',
    responseType: VendorResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateVendorDto,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.create(organizationId, createDto, currentUser.id);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all vendors with filters
   */
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: VendorStatus,
    @Query('vendorType') vendorType?: VendorType,
    @Query('search') search?: string,
  ): Promise<{
    data: VendorResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { vendors, total } = await this.vendorService.findAll(organizationId, page, limit, {
      status,
      vendorType,
      search,
    });

    return {
      data: plainToInstance(VendorResponseDto, vendors, {
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
   * Get vendor by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get vendor by ID',
    description: 'Retrieve a specific vendor by its ID',
    responseType: VendorResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.findById(id, organizationId);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update vendor
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update vendor',
    description: 'Update an existing vendor',
    responseType: VendorResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateVendorDto,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.update(id, organizationId, updateDto, currentUser.id);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete vendor
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete vendor',
    description: 'Soft delete a vendor',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.vendorService.delete(id, organizationId, currentUser.id);

    return { message: 'Vendor deleted successfully' };
  }

  /**
   * Get vendor statistics
   */
  @Get('stats/summary')
  @ApiOperation({
    summary: 'Get vendor statistics',
    description: 'Get vendor count by status and type',
  })
  async getStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<ExtendedStatisticsResponse<VendorStatus, VendorType>> {
    return this.vendorService.getStatistics(organizationId);
  }

  /**
   * Change vendor status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change vendor status',
    description: 'Update the status of a vendor',
  })
  async changeStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: VendorStatus,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.changeStatus(
      id,
      organizationId,
      status,
      currentUser.id,
    );

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update vendor rating
   */
  @Patch(':id/rating')
  @ApiOperation({
    summary: 'Update vendor rating',
    description: 'Update the rating of a vendor (0-5)',
  })
  async updateRating(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('rating') rating: number,
  ): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.updateRating(id, organizationId, rating);

    return plainToInstance(VendorResponseDto, vendor, {
      excludeExtraneousValues: true,
    });
  }
}
