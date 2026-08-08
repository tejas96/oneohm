import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LookupDataType, LookupScopeType } from '@tejas96/shared/types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLookupDto {
  @ApiProperty({
    example: 'lead_source',
    description: 'Lookup type code — lowercase snake_case identifier',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'typeCode must be lowercase snake_case starting with a letter',
  })
  typeCode!: string;

  @ApiProperty({ example: 'referral', description: 'Unique code within the type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'Referral', description: 'Human-readable label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({
    example: 'referral',
    description: 'Stored value (defaults to code if omitted)',
  })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ enum: LookupDataType, example: LookupDataType.STRING })
  @IsEnum(LookupDataType)
  @IsOptional()
  dataType?: LookupDataType;

  @ApiPropertyOptional({
    enum: LookupScopeType,
    example: LookupScopeType.GLOBAL,
    default: LookupScopeType.GLOBAL,
  })
  @IsEnum(LookupScopeType)
  @IsOptional()
  scopeType?: LookupScopeType;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Required when the lookup is record-scoped',
  })
  @IsUUID()
  @IsOptional()
  scopeId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Parent lookup ID for hierarchical lookups',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Lookup that must be selected before this one',
  })
  @IsUUID()
  @IsOptional()
  dependsOnId?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order (lower = first)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({ example: '#4CAF50', description: 'UI color hint' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'TrendingUp', description: 'Icon name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: { region: 'north', priority: 1 },
    description: 'Arbitrary JSON metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
