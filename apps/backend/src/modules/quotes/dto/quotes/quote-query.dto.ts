import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteSortField, QuoteStatus, SortOrder } from '@tejas96/shared/types';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Query DTO for quote list endpoint
 * Supports pagination, search, filtering, and sorting
 *
 * @example
 * GET /quotes?status=draft&sortBy=createdAt&sortOrder=DESC&page=1&limit=20
 */
export class QuoteQueryDto {
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
    maximum: 1000,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 20;

  // ==================== Search ====================

  @ApiPropertyOptional({
    description:
      'Search query - searches in quote number, customer name, phone, property name (min 2 chars)',
    minLength: 2,
    example: 'raj',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o: QuoteQueryDto) => !!o.search && o.search.length > 0)
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  // ==================== Filters ====================

  @ApiPropertyOptional({
    description: 'Filter by quote status',
    enum: QuoteStatus,
    example: QuoteStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by sales person ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  salesPersonId?: string;

  @ApiPropertyOptional({
    description: 'Filter by reseller ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  resellerId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601 format, filters on quoteDate)',
    example: '2025-01-01',
  })
  @IsOptional()
  @ValidateIf((o: QuoteQueryDto) => !!o.fromDate)
  @IsDateString({}, { message: 'fromDate must be a valid ISO 8601 date (e.g., 2025-01-01)' })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601 format, inclusive - includes entire day)',
    example: '2025-12-31',
  })
  @IsOptional()
  @ValidateIf((o: QuoteQueryDto) => !!o.toDate)
  @IsDateString({}, { message: 'toDate must be a valid ISO 8601 date (e.g., 2025-12-31)' })
  toDate?: string;

  // ==================== Sorting ====================

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: QuoteSortField,
    default: QuoteSortField.CREATED_AT,
    example: QuoteSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(QuoteSortField)
  sortBy: QuoteSortField = QuoteSortField.CREATED_AT;

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
