import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@tejas96/shared/types';
import { IsEnum } from 'class-validator';

/**
 * DTO for updating product status
 */
export class UpdateProductStatusDto {
  @ApiProperty({
    enum: Object.values(ProductStatus),
    enumName: 'ProductStatus',
    example: ProductStatus.ACTIVE,
  })
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
