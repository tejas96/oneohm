import { PartialType } from '@nestjs/swagger';

import { CreateProductCategoryDto } from './create-product-category.dto';

/**
 * DTO for updating a product category
 * All fields are optional
 */
export class UpdateProductCategoryDto extends PartialType(CreateProductCategoryDto) {}
