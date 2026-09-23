import { ApiProperty } from '@nestjs/swagger';
import { REPORT_DEFINITIONS } from '@tejas96/shared/reports';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const REPORT_IDS = REPORT_DEFINITIONS.map((definition) => definition.id);

export class UpdateReportFactsDto {
  @ApiProperty({
    description: 'Manual fact values by key. null clears a value; an omitted key is left alone.',
    type: 'object',
    additionalProperties: { type: 'string', nullable: true },
  })
  @IsObject()
  facts!: Record<string, string | null>;
}

export class RenderReportDto {
  @ApiProperty({ enum: REPORT_IDS })
  @IsIn(REPORT_IDS)
  reportId!: string;
}

export class ReportFileRefDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicUrl!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  fileSizeBytes!: number;
}

export class FileReportDto extends RenderReportDto {
  @ApiProperty({ type: ReportFileRefDto })
  @ValidateNested()
  @Type(() => ReportFileRefDto)
  file!: ReportFileRefDto;
}

export class ReportsPendingDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  projectIds!: string[];
}
