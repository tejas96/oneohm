import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Role, RolesGuard } from '@oneohm-epc/shared-auth';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import type { CurrentUserType } from '@oneohm-epc/shared-auth';
import {
  CreateProductCategoryDto,
  ProductCategoryResponseDto,
  UpdateProductCategoryDto,
} from '../dto/product-categories';
import { ProductCategoryService } from '../services/product-category.service';

@ApiTags('Product Categories')
@Controller('product-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductCategoryController {
  constructor(private readonly categoryService: ProductCategoryService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new product category',
    description: 'Create a new hierarchical product category',
    responseType: ProductCategoryResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.categoryService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(ProductCategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all product categories',
    description: 'Retrieve all product categories (flat list)',
    responseType: ProductCategoryResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ProductCategoryResponseDto[]> {
    const categories = await this.categoryService.findAll(currentUser.organizationId);

    return plainToInstance(ProductCategoryResponseDto, categories, {
      excludeExtraneousValues: true,
    });
  }

  @Get('tree')
  @ApiReadAll({
    summary: 'Get category hierarchy tree',
    description: 'Retrieve hierarchical tree structure of categories',
    responseType: ProductCategoryResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async getCategoryTree(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ProductCategoryResponseDto[]> {
    const tree = await this.categoryService.getCategoryTree(currentUser.organizationId);

    return plainToInstance(ProductCategoryResponseDto, tree, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get product category by ID',
    description: 'Retrieve a specific product category with its children',
    responseType: ProductCategoryResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.categoryService.findById(id, currentUser.organizationId);

    return plainToInstance(ProductCategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ApiUpdate({
    summary: 'Update product category',
    description: 'Update an existing product category',
    responseType: ProductCategoryResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.categoryService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(ProductCategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete product category',
    description: 'Soft delete a product category (must not have children)',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.categoryService.delete(id, currentUser.organizationId);
  }
}
