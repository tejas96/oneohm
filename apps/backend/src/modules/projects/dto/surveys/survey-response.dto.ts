import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SiteSurveyStatus,
  type FileAttachment,
  type SurveyData,
} from '@oneohm-epc/shared-types';
import { Exclude, Expose, Transform } from 'class-transformer';

/**
 * Site Survey Response DTO
 * Serialized response for site survey entities
 */
@Exclude()
export class SurveyResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiPropertyOptional({ example: 'SSV-ONEOHM_EPC-2026-0001' })
  @Expose()
  surveyCode?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  surveyorId?: string;

  @ApiProperty({
    enum: Object.values(SiteSurveyStatus),
    enumName: 'SiteSurveyStatus',
    example: SiteSurveyStatus.COMPLETED,
  })
  @Expose()
  status!: SiteSurveyStatus;

  @ApiPropertyOptional({
    example: {
      roofType: 'Concrete flat roof',
      roofCondition: 'good',
      roofOrientation: 'south',
      roofTiltAngle: 15.5,
      availableAreaSqm: 85.5,
    },
  })
  @Expose()
  @Transform(({ obj }) => obj.surveyData ?? null)
  surveyData?: SurveyData;

  @ApiPropertyOptional({
    example: [{ id: '1', filename: 'electrical_report.pdf', url: 'https://...' }],
    type: 'array',
  })
  @Expose()
  @Transform(({ obj }) => obj.documents ?? null)
  documents?: FileAttachment[];

  @ApiProperty({ example: '2026-02-05T10:30:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2026-02-05T16:20:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  updatedBy?: string;

  @ApiPropertyOptional({ example: null })
  @Expose()
  deletedAt?: Date;
}
