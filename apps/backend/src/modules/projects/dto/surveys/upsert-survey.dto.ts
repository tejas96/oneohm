import { ApiPropertyOptional } from '@nestjs/swagger';
import { type FileAttachment } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { SurveyDataDto } from './survey-data.dto';

/**
 * DTO for creating or updating a site survey (upsert)
 * projectId comes from the URL path parameter, not the body.
 */
export class UpsertSurveyDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Surveyor/technician user ID',
  })
  @IsUUID()
  @IsOptional()
  surveyorId?: string;

  @ApiPropertyOptional({ description: 'Survey assessment data', type: () => SurveyDataDto })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SurveyDataDto)
  surveyData?: SurveyDataDto;

  @ApiPropertyOptional({
    description: 'Survey documents',
    type: 'array',
    example: [
      {
        id: '1',
        url: 'https://storage.example.com/surveys/electrical.pdf',
        filename: 'electrical_report.pdf',
        fileType: 'application/pdf',
        fileSize: 512000,
        uploadedAt: '2026-02-05T09:00:00Z',
      },
    ],
  })
  @IsArray()
  @IsOptional()
  @Type(() => Object)
  documents?: FileAttachment[];
}
