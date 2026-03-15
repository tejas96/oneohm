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
import { type CurrentUserType } from '../../auth/types';
import {
  CreateProductCategoryDto,
  ProductCategoryResponseDto,
  UpdateProductCategoryDto,
} from '../dto/product-categories';
import { ProductCategoryService } from '../services/product-category.service';

@ApiTags('Product Categories')
@Controller('product-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProductCategoryController {
  constructor(private readonly categoryService: ProductCategoryService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new product category',
    description: 'Create a new hierarchical product category',
    responseType: ProductCategoryResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.categoryService.create(organizationId, createDto, currentUser.id);

    return plainToInstance(ProductCategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all product categories',
    description: 'Retrieve all product categories (flat list)',
    responseType: ProductCategoryResponseDto,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<ProductCategoryResponseDto[]> {
    const categories = await this.categoryService.findAll(organizationId);

    return plainToInstance(ProductCategoryResponseDto, categories, {
      excludeExtraneousValues: true,
    });
  }

  @Get('tree')
  @ApiReadAll({
    summary: 'Get category hierarchy tree',
    description: 'Retrieve hierarchical tree structure of categories',
    responseType: ProductCategoryResponseDto,
  })
  async getCategoryTree(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<ProductCategoryResponseDto[]> {
    const tree = await this.categoryService.getCategoryTree(organizationId);

    return plainToInstance(ProductCategoryResponseDto, tree, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get product category by ID',
    description: 'Retrieve a specific product category with its children',
    responseType: ProductCategoryResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.categoryService.findById(id, organizationId);

    return plainToInstance(ProductCategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ApiUpdate({
    summary: 'Update product category',
    description: 'Update an existing product category',
    responseType: ProductCategoryResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.categoryService.update(
      id,
      organizationId,
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
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.categoryService.delete(id, organizationId);
  }
}
