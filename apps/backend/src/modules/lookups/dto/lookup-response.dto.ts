import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LookupDataType, LookupScopeType } from '@oneohm-epc/shared/types';
import { Expose, Transform } from 'class-transformer';

export class LookupResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ example: 'lead_source' })
  @Expose()
  typeCode!: string;

  @ApiProperty({ example: 'referral' })
  @Expose()
  code!: string;

  @ApiProperty({ example: 'Referral' })
  @Expose()
  label!: string;

  @ApiPropertyOptional({ example: 'referral' })
  @Expose()
  value?: string;

  @ApiPropertyOptional({ enum: LookupDataType })
  @Expose()
  dataType?: LookupDataType;

  @ApiProperty({ enum: LookupScopeType, example: LookupScopeType.GLOBAL })
  @Expose()
  scopeType!: LookupScopeType;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  scopeId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @Expose()
  parentId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @Expose()
  dependsOnId?: string;

  @ApiProperty({ example: 0 })
  @Expose()
  orderIndex!: number;

  @ApiPropertyOptional({ example: '#4CAF50' })
  @Expose()
  color?: string;

  @ApiPropertyOptional({ example: 'TrendingUp' })
  @Expose()
  icon?: string;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiPropertyOptional({ example: { region: 'north' } })
  @Expose()
  @Transform(({ obj }) => obj.metadata)
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  updatedBy?: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  deletedAt?: Date;
}
