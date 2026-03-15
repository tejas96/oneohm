import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LeadTemperature,
  PropertySortField,
  PropertyStatus,
  PropertyType,
  SortOrder,
} from '@oneohm-epc/shared/types';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Query DTO for property list endpoint
 * Supports pagination, search, filtering, and sorting
 *
 * @example
 * GET /customer-properties?leadTemperature=hot&propertyType=residential&sortBy=createdAt&sortOrder=DESC&page=1&limit=20
 */
export class PropertyQueryDto {
  // ==================== Pagination ====================

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  // ==================== Search ====================

  @ApiPropertyOptional({
    description:
      'Search query - searches in property name, address, city, consumer number, customer name (min 2 chars)',
    minLength: 2,
    example: 'koramangala',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o: PropertyQueryDto) => !!o.search && o.search.length > 0)
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  // ==================== Filters ====================

  @ApiPropertyOptional({
    description: 'Filter by lead temperature',
    enum: LeadTemperature,
    example: LeadTemperature.HOT,
  })
  @IsOptional()
  @IsEnum(LeadTemperature)
  leadTemperature?: LeadTemperature;

  @ApiPropertyOptional({
    description: 'Filter by property type',
    enum: PropertyType,
    example: PropertyType.RESIDENTIAL,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    description: 'Filter by property status',
    enum: PropertyStatus,
    example: PropertyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({
    description: 'Filter by city (partial match, case-insensitive)',
    example: 'Bangalore',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by state (partial match, case-insensitive)',
    example: 'Karnataka',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by creator - use "me" for current user or provide userId',
    example: 'me',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601 format)',
    example: '2025-01-01',
  })
  @IsOptional()
  @ValidateIf((o: PropertyQueryDto) => !!o.fromDate)
  @IsDateString({}, { message: 'fromDate must be a valid ISO 8601 date (e.g., 2025-01-01)' })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601 format, inclusive - includes entire day)',
    example: '2025-12-31',
  })
  @IsOptional()
  @ValidateIf((o: PropertyQueryDto) => !!o.toDate)
  @IsDateString({}, { message: 'toDate must be a valid ISO 8601 date (e.g., 2025-12-31)' })
  toDate?: string;

  // ==================== Sorting ====================

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: PropertySortField,
    default: PropertySortField.CREATED_AT,
    example: PropertySortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(PropertySortField)
  sortBy: PropertySortField = PropertySortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
