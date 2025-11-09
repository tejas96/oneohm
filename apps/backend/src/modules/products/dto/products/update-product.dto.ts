import { PartialType } from '@nestjs/swagger';

import { CreateProductDto } from './create-product.dto';

/**
 * DTO for updating a product
 * All fields are optional
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}

