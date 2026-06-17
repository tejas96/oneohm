import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';
import { Expose, Type } from 'class-transformer';

export class ConsumerDocumentDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ enum: DocumentCategory })
  @Expose()
  category!: DocumentCategory;

  @ApiProperty({ enum: DocumentEntityType })
  @Expose()
  entityType!: DocumentEntityType;

  @ApiProperty()
  @Expose()
  tag!: string;

  @ApiProperty()
  @Expose()
  fileName!: string;

  @ApiProperty()
  @Expose()
  fileUrl!: string;

  @ApiPropertyOptional()
  @Expose()
  fileSizeBytes?: number;

  @ApiPropertyOptional()
  @Expose()
  mimeType?: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;
}

export class ConsumerProjectDocumentsResponseDto {
  @ApiProperty({ type: [ConsumerDocumentDto] })
  @Expose()
  @Type(() => ConsumerDocumentDto)
  documents!: ConsumerDocumentDto[];
}
