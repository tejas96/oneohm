import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConnectionType,
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
  SortOrder,
} from '@tejas96/shared/types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Query DTO for customer list endpoint
 * Supports pagination, search, filtering, and sorting
 *
 * @example
 * GET /customers?status=active&city=Mumbai&sortBy=createdAt&sortOrder=DESC&page=1&limit=20
 */
export class CustomerQueryDto {
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
    description: 'Search query - searches in name, phone, email, city (min 2 chars)',
    minLength: 2,
    example: 'raj',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o: CustomerQueryDto) => !!o.search && o.search.length > 0)
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  // ==================== Filters ====================

  @ApiPropertyOptional({
    description: 'Filter by customer status',
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({
    description: 'Filter by city (partial match, case-insensitive)',
    example: 'Mumbai',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by lead source',
    enum: LeadSource,
    example: LeadSource.REFERRAL,
  })
  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiPropertyOptional({
    description: 'Filter by customer group name or code (partial match, case-insensitive).',
    example: 'GRP-0001',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  groupSearch?: string;

  @ApiPropertyOptional({
    description: 'Filter by creator - use "me" for current user or provide userId',
    example: 'me',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by assignee ID - use "me" for current user or provide userId',
    example: 'me',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by whether customer has properties (true) or none (false)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  hasProperty?: boolean;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601 format)',
    example: '2025-01-01',
  })
  @IsOptional()
  @ValidateIf((o: CustomerQueryDto) => !!o.fromDate)
  @IsDateString({}, { message: 'fromDate must be a valid ISO 8601 date (e.g., 2025-01-01)' })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601 format, inclusive - includes entire day)',
    example: '2025-12-31',
  })
  @IsOptional()
  @ValidateIf((o: CustomerQueryDto) => !!o.toDate)
  @IsDateString({}, { message: 'toDate must be a valid ISO 8601 date (e.g., 2025-12-31)' })
  toDate?: string;

  // ==================== Property-level filters (customer has matching property) ====================

  @ApiPropertyOptional({
    description: 'Filter customers who have at least one property with this type',
    enum: PropertyType,
    example: PropertyType.RESIDENTIAL,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({
    description: 'Filter customers who have at least one property with this status',
    enum: PropertyStatus,
    example: PropertyStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PropertyStatus)
  propertyStatus?: PropertyStatus;

  @ApiPropertyOptional({
    description: 'Filter customers who have at least one property with this connection type',
    enum: ConnectionType,
    example: ConnectionType.SINGLE_PHASE,
  })
  @IsOptional()
  @IsEnum(ConnectionType)
  connectionType?: ConnectionType;

  @ApiPropertyOptional({
    description: 'Filter customers who have at least one property with this lead temperature',
    enum: LeadTemperature,
    example: LeadTemperature.HOT,
  })
  @IsOptional()
  @IsEnum(LeadTemperature)
  leadTemperature?: LeadTemperature;

  @ApiPropertyOptional({
    description:
      'Filter customers who have at least one property whose latest quote has this status',
    enum: QuoteStatus,
    example: QuoteStatus.ACCEPTED,
  })
  @IsOptional()
  @IsEnum(QuoteStatus)
  quoteStatus?: QuoteStatus;

  @ApiPropertyOptional({
    description:
      'Filter customers who have at least one property with minimum system size (kW, inclusive)',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  propertySystemSizeMin?: number;

  @ApiPropertyOptional({
    description:
      'Filter customers who have at least one property with maximum system size (kW, inclusive)',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  propertySystemSizeMax?: number;

  @ApiPropertyOptional({
    description:
      'Filter customers who have at least one property in this city (partial match, case-insensitive)',
    example: 'Bangalore',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  propertyCity?: string;

  @ApiPropertyOptional({
    description:
      'Filter customers who have at least one property in this state (partial match, case-insensitive)',
    example: 'Karnataka',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  propertyState?: string;

  // ==================== Sorting ====================

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: CustomerSortField,
    default: CustomerSortField.CREATED_AT,
    example: CustomerSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(CustomerSortField)
  sortBy: CustomerSortField = CustomerSortField.CREATED_AT;

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
