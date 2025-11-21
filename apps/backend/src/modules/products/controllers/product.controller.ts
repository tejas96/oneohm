import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { type PaginatedResponse, ProductStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

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
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new product',
    description: 'Create a new solar equipment product with specifications',
    responseType: ProductResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.create(
      organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all products',
    description: 'Retrieve all products with pagination and filters',
    responseType: ProductResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
    additionalQueries: [
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      {
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per page (default: 20)',
      },
      {
        name: 'status',
        required: false,
        enum: Object.values(ProductStatus),
        description: 'Filter by status',
      },
      { name: 'type', required: false, type: String, description: 'Filter by product type' },
      {
        name: 'categoryId',
        required: false,
        type: String,
        description: 'Filter by category ID',
      },
      { name: 'brand', required: false, type: String, description: 'Filter by brand' },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search in name, code, description',
      },
    ],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: ProductStatus,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    const result = await this.productService.findAll(organizationId, page, limit, {
      status,
      type,
      categoryId,
      brand,
      search,
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
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.findById(id, organizationId);

    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ApiUpdate({
    summary: 'Update product',
    description: 'Update an existing product',
    responseType: ProductResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );

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
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateProductStatusDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.updateStatus(
      id,
      organizationId,
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
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.productService.delete(id, organizationId);
  }
}
