import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory, DocumentEntityType } from '@oneohm-epc/shared/types';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryDocumentsDto {
  @ApiPropertyOptional({
    description: 'Filter by property ID (returns all entity types for this property)',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: DocumentEntityType })
  @IsOptional()
  @IsEnum(DocumentEntityType)
  entityType?: DocumentEntityType;

  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Comma-separated entity IDs for batch query' })
  @IsOptional()
  @IsString()
  entityIds?: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Comma-separated tags for OR filter' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  limit?: number;
}
