import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentEntityType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReportContextDto {
  @ApiProperty({ enum: DocumentEntityType })
  @IsEnum(DocumentEntityType)
  entityType!: DocumentEntityType;

  @ApiProperty()
  @IsUUID()
  entityId!: string;
}

export class ReportInitializeDto {
  @ApiProperty({ example: 'wcr' })
  @IsString()
  @IsNotEmpty()
  reportId!: string;

  @ApiProperty({ type: ReportContextDto })
  @ValidateNested()
  @Type(() => ReportContextDto)
  context!: ReportContextDto;

  @ApiPropertyOptional({
    description: 'When true, skip merging saved draft fields and use fresh project data only',
  })
  @IsOptional()
  @IsBoolean()
  ignoreSavedDraft?: boolean;
}

export class ReportRenderDto {
  @ApiProperty({ example: 'wcr' })
  @IsString()
  @IsNotEmpty()
  reportId!: string;

  @ApiProperty({ type: ReportContextDto })
  @ValidateNested()
  @Type(() => ReportContextDto)
  context!: ReportContextDto;

  @ApiProperty({ description: 'Full merged field snapshot' })
  @IsObject()
  fields!: Record<string, string>;
}

export class ReportSaveFileDto {
  @ApiProperty({ description: 'S3 object key returned from presigned upload' })
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiProperty({ description: 'Public URL returned from presigned upload' })
  @IsString()
  @IsNotEmpty()
  publicUrl!: string;

  @ApiProperty({ description: 'Uploaded PDF size in bytes' })
  @IsNumber()
  @Min(1)
  fileSizeBytes!: number;
}

export class ReportSaveDto extends ReportRenderDto {
  @ApiProperty({ type: ReportSaveFileDto })
  @ValidateNested()
  @Type(() => ReportSaveFileDto)
  file!: ReportSaveFileDto;
}

export class ReportInitializeResponseDto {
  @ApiProperty()
  fields!: Record<string, string>;

  @ApiProperty()
  html!: string;

  @ApiPropertyOptional()
  savedDocumentId?: string;
}

export class ReportPreviewResponseDto {
  @ApiProperty()
  html!: string;
}

export class ReportSaveResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  downloadUrl!: string;
}
