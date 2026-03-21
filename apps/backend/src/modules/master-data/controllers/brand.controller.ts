import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { BrandResponseDto, CreateBrandDto, UpdateBrandDto } from '../dto';
import { BrandService } from '../services/brand.service';

@ApiTags('Brands')
@Controller('brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new brand',
    description: 'Register a new brand in the product catalog',
    responseType: BrandResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: CreateBrandDto,
  ): Promise<BrandResponseDto> {
    const brand = await this.brandService.create(organizationId, body, currentUser.id);
    return toDto(BrandResponseDto, brand);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all brands',
    description: 'Retrieve all brands, optionally filtered by product type',
    responseType: BrandResponseDto,
    additionalQueries: [
      {
        name: 'productTypeId',
        required: false,
        type: String,
        description: 'Filter by product type',
      },
      { name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search by brand name or manufacturer',
      },
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      { name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' },
      {
        name: 'sortBy',
        required: false,
        type: String,
        description: 'Sort field (name, createdAt)',
      },
      {
        name: 'sortOrder',
        required: false,
        type: String,
        description: 'Sort direction (ASC, DESC)',
      },
    ],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('productTypeId') productTypeId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<{
    data: BrandResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter = {
      productTypeId,
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      search,
      page,
      limit,
      sortBy,
      sortOrder: sortOrder === 'DESC' ? ('DESC' as const) : ('ASC' as const),
    };
    const result = await this.brandService.findAll(organizationId, filter);
    return {
      data: toDtoArray(BrandResponseDto, result.data),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get brand by ID',
    description: 'Retrieve a specific brand',
    responseType: BrandResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BrandResponseDto> {
    const brand = await this.brandService.findById(id, organizationId);
    return toDto(BrandResponseDto, brand);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update brand',
    description: 'Update an existing brand',
    responseType: BrandResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    const brand = await this.brandService.update(id, organizationId, body, currentUser.id);
    return toDto(BrandResponseDto, brand);
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete brand',
    description: 'Soft delete a brand',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.brandService.delete(id, organizationId);
  }
}
