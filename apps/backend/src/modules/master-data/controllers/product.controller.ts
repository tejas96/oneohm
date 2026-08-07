import {
  Body,
  Controller,
  Delete,
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
import { type PaginatedResponse, ProductStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateProductDto,
  ProductResponseDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from '../dto/products';
import { ProductService } from '../services/product.service';

@ApiTags('Products')
@Controller('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new product',
    description: 'Create a new solar equipment product with specifications',
    responseType: ProductResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.create(createDto, currentUser.id);

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all products',
    description: 'Retrieve all products with pagination and filters',
    responseType: ProductResponseDto,
    additionalQueries: [
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      { name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' },
      {
        name: 'status',
        required: false,
        enum: Object.values(ProductStatus),
        description: 'Filter by status',
      },
      {
        name: 'productTypeId',
        required: false,
        type: String,
        description: 'Filter by product type ID',
      },
      {
        name: 'type',
        required: false,
        type: String,
        description: 'Filter by product type code (e.g. solar_panel, inverter)',
      },
      { name: 'brandId', required: false, type: String, description: 'Filter by brand ID' },
      { name: 'brand', required: false, type: String, description: 'Filter by brand name' },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search in name, code, description',
      },
      {
        name: 'hasActivePrice',
        required: false,
        type: Boolean,
        description: 'When true, only products with an active price effective today',
      },
    ],
  })
  async findAll(
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: ProductStatus,
    @Query('productTypeId') productTypeId?: string,
    @Query('type') type?: string,
    @Query('brandId') brandId?: string,
    @Query('brand') brand?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('hasActivePrice') hasActivePrice?: string,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const result = await this.productService.findAll(page, limit, {
      status,
      productTypeId,
      type,
      brandId,
      brand,
      search,
      sortBy,
      sortOrder: sortOrder === 'DESC' ? 'DESC' : sortOrder === 'ASC' ? 'ASC' : undefined,
      hasActivePrice: hasActivePrice === 'true',
    });

    return {
      data: plainToInstance(ProductResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get product by ID',
    description: 'Retrieve a specific product with full details',
    responseType: ProductResponseDto,
  })
  async findOne(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.findById(id);

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update product',
    description: 'Update an existing product',
    responseType: ProductResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.update(id, updateDto, currentUser.id);

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/status')
  @ApiAction({
    path: ':id/status',
    summary: 'Update product status',
    description: 'Update the status of a product (active/inactive/discontinued)',
    responseType: ProductResponseDto,
  })
  async updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateProductStatusDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.updateStatus(
      id,
      statusDto.status,
      currentUser.id,
    );

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete product',
    description: 'Soft delete a product',
  })
  async delete(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.productService.delete(id);
  }
}
