import {
  Body,
  Controller,
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
  ApiReadAll,
  ApiReadOne,
  ApiUpdate
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { ProductTypeEntity } from '../entities/product-type.entity';
import { ProductTypeService } from '../services/product-type.service';

@ApiTags('Product Types')
@Controller('product-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new product type',
    description: 'Define a new product type with attribute schema',
    responseType: ProductTypeEntity,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: Partial<ProductTypeEntity>,
  ): Promise<ProductTypeEntity> {
    return this.productTypeService.create(body, currentUser.id);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all product types',
    description: 'Retrieve all product types with their attribute schemas',
    responseType: ProductTypeEntity,
    additionalQueries: [
      { name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' },
      { name: 'search', required: false, type: String, description: 'Search by name or code' },
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      { name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' },
      {
        name: 'sortBy',
        required: false,
        type: String,
        description: 'Sort field (name, sortOrder, defaultGstRate, createdAt)',
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
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<{
    data: ProductTypeEntity[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filters = {
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      search,
      page,
      limit,
      sortBy,
      sortOrder: sortOrder === 'DESC' ? ('DESC' as const) : ('ASC' as const),
    };
    return this.productTypeService.findAll(filters);
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get product type by ID',
    description: 'Retrieve a specific product type with its attribute schema',
    responseType: ProductTypeEntity,
  })
  async findOne(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductTypeEntity> {
    return this.productTypeService.findById(id);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update product type',
    description: 'Update an existing product type',
    responseType: ProductTypeEntity,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<ProductTypeEntity>,
  ): Promise<ProductTypeEntity> {
    return this.productTypeService.update(id, body, currentUser.id);
  }
}
