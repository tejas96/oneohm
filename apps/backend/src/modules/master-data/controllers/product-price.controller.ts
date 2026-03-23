import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
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
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateProductPriceDto,
  ProductPriceResponseDto,
  UpdateProductPriceDto,
} from '../dto/product-prices';
import { ProductPriceService } from '../services/product-price.service';

@ApiTags('Product Prices')
@Controller('products/:productId/prices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProductPriceController {
  constructor(private readonly productPriceService: ProductPriceService) {}

  @Post()
  @ApiCreate({
    summary: 'Create product price',
    description: 'Create a new price entry for a product',
    responseType: ProductPriceResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: CreateProductPriceDto,
  ): Promise<ProductPriceResponseDto> {
    const price = await this.productPriceService.create(
      organizationId,
      productId,
      body,
      currentUser.id,
    );
    return toDto(ProductPriceResponseDto, price);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all product prices',
    description: 'Retrieve all pricing entries for a product',
    responseType: ProductPriceResponseDto,
    additionalQueries: [
      {
        name: 'isActive',
        required: false,
        type: Boolean,
        description: 'Filter by active status',
      },
    ],
    includePagination: false,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('isActive') isActive?: string,
  ): Promise<ProductPriceResponseDto[]> {
    const filter = isActive !== undefined ? { isActive: isActive === 'true' } : undefined;
    const prices = await this.productPriceService.findAll(organizationId, productId, filter);
    return toDtoArray(ProductPriceResponseDto, prices);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update product price',
    description: 'Update an existing product price',
    responseType: ProductPriceResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductPriceDto,
  ): Promise<ProductPriceResponseDto> {
    const price = await this.productPriceService.update(
      id,
      organizationId,
      productId,
      body,
      currentUser.id,
    );
    return toDto(ProductPriceResponseDto, price);
  }

  @Patch(':id/deactivate')
  @ApiUpdate({
    summary: 'Deactivate product price',
    description: 'Deactivate a product price entry',
    responseType: ProductPriceResponseDto,
    method: 'PATCH',
    path: ':id/deactivate',
  })
  async deactivate(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductPriceResponseDto> {
    const price = await this.productPriceService.deactivate(
      id,
      organizationId,
      productId,
      currentUser.id,
    );
    return toDto(ProductPriceResponseDto, price);
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete product price',
    description: 'Deactivate a product price entry',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.productPriceService.deactivate(id, organizationId, productId, currentUser.id);
  }
}
