import { ApiPropertyOptional } from '@nestjs/swagger';
import { type FileAttachment } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { SurveyDataDto } from './survey-data.dto';

/**
 * DTO for partially updating a site survey.
 * All fields are optional -- only provided fields are merged.
 */
export class UpdateSurveyDto {
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

  @ApiPropertyOptional({ description: 'Survey documents', type: 'array' })
  @IsArray()
  @IsOptional()
  @Type(() => Object)
  documents?: FileAttachment[];
}
