import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory, DocumentEntityType } from '@oneohm-epc/shared/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

@Exclude()
class DocumentUserDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() firstName!: string;
  @ApiProperty() @Expose() lastName!: string;
}

@Exclude()
export class DocumentResponseDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() organizationId!: string;
  @ApiProperty() @Expose() propertyId!: string;
  @ApiProperty({ enum: DocumentEntityType }) @Expose() entityType!: DocumentEntityType;
  @ApiProperty() @Expose() entityId!: string;
  @ApiProperty({ enum: DocumentCategory }) @Expose() category!: DocumentCategory;
  @ApiProperty() @Expose() tag!: string;
  @ApiProperty() @Expose() fileName!: string;
  @ApiProperty() @Expose() fileUrl!: string;
  @ApiPropertyOptional() @Expose() fileSizeBytes?: number;
  @ApiPropertyOptional() @Expose() mimeType?: string;
  @ApiPropertyOptional() @Expose() @Transform(({ obj }) => obj.metadata) metadata?: Record<
    string,
    unknown
  >;
  @ApiPropertyOptional() @Expose() notes?: string;
  @ApiProperty() @Expose() createdAt!: Date;
  @ApiProperty() @Expose() updatedAt!: Date;
  @ApiPropertyOptional() @Expose() createdBy?: string;
  @ApiPropertyOptional() @Expose() updatedBy?: string;

  @ApiPropertyOptional({ type: DocumentUserDto })
  @Expose()
  @Type(() => DocumentUserDto)
  uploadedByUser?: DocumentUserDto;
}
