import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@oneohm-epc/shared/types';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Update property ID' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Update tag' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ description: 'Update metadata' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value ?? undefined)
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
