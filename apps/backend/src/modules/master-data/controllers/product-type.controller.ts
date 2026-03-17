import {
  Body,
  Controller,
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
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: Partial<ProductTypeEntity>,
  ): Promise<ProductTypeEntity> {
    return this.productTypeService.create(organizationId, body, currentUser.id);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all product types',
    description: 'Retrieve all product types with their attribute schemas',
    responseType: ProductTypeEntity,
    additionalQueries: [
      {
        name: 'isActive',
        required: false,
        type: Boolean,
        description: 'Filter by active status',
      },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search by name or code',
      },
    ],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ): Promise<ProductTypeEntity[]> {
    const filters = isActive !== undefined ? { isActive: isActive === 'true', search } : { search };
    return this.productTypeService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get product type by ID',
    description: 'Retrieve a specific product type with its attribute schema',
    responseType: ProductTypeEntity,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductTypeEntity> {
    return this.productTypeService.findById(id, organizationId);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update product type',
    description: 'Update an existing product type',
    responseType: ProductTypeEntity,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<ProductTypeEntity>,
  ): Promise<ProductTypeEntity> {
    return this.productTypeService.update(id, organizationId, body, currentUser.id);
  }
}
