import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory, DocumentEntityType } from '@oneohm-epc/shared/types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiPropertyOptional({ description: 'Organization ID (set by server from auth context)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Property ID (auto-resolved from entity if not provided)' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ enum: DocumentEntityType })
  @IsEnum(DocumentEntityType)
  @IsNotEmpty()
  entityType!: DocumentEntityType;

  @ApiProperty({ description: 'Entity UUID this document belongs to' })
  @IsUUID()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty({ enum: DocumentCategory })
  @IsEnum(DocumentCategory)
  @IsNotEmpty()
  category!: DocumentCategory;

  @ApiProperty({ description: 'Document tag (from DocumentTag enum or custom)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tag!: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: 'File URL or storage key' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value ?? undefined)
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateDocumentDto {
  @ApiProperty({ type: [CreateDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentDto)
  documents!: CreateDocumentDto[];
}
