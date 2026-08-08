import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BrandResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  manufacturerName?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  logoUrl?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  website?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  supportContact?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  deletedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ type: [String] })
  @Expose()
  productTypeIds!: string[];
}
