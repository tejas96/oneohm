import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoofCondition,
  RoofOrientation,
  SiteSurveyStatus,
  type ElectricalDetails,
  type FileAttachment,
  type ShadingAnalysis,
} from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';

/**
 * Site Survey Response DTO
 * Serialized response for site survey entities
 */
export class SurveyResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  surveyorId?: string;

  @ApiProperty({ example: '2025-02-05T09:00:00Z' })
  @Expose()
  surveyDate!: Date;

  @ApiProperty({
    enum: Object.values(SiteSurveyStatus),
    enumName: 'SiteSurveyStatus',
    example: SiteSurveyStatus.COMPLETED,
  })
  @Expose()
  status!: SiteSurveyStatus;

  @ApiPropertyOptional({ example: 'Concrete flat roof' })
  @Expose()
  roofType?: string;

  @ApiPropertyOptional({
    enum: Object.values(RoofCondition),
    enumName: 'RoofCondition',
    example: RoofCondition.GOOD,
  })
  @Expose()
  roofCondition?: RoofCondition;

  @ApiPropertyOptional({
    enum: Object.values(RoofOrientation),
    enumName: 'RoofOrientation',
    example: RoofOrientation.SOUTH,
  })
  @Expose()
  roofOrientation?: RoofOrientation;

  @ApiPropertyOptional({ example: 15.5 })
  @Expose()
  roofTiltAngle?: number;

  @ApiPropertyOptional({ example: 85.5 })
  @Expose()
  availableAreaSqm?: number;

  @ApiPropertyOptional({
    example: {
      hasShading: true,
      shadingPercentage: 15,
      shadingSource: ['trees'],
    },
  })
  @Expose()
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional({
    example: {
      panelType: 'MCB',
      panelCapacity: 60,
      voltage: 240,
      phaseType: 'single_phase',
    },
  })
  @Expose()
  electricalDetails?: ElectricalDetails;

  @ApiPropertyOptional({ example: 'Roof structure is sound' })
  @Expose()
  structuralAssessment?: string;

  @ApiPropertyOptional({ example: 'Easy access via external staircase' })
  @Expose()
  siteAccess?: string;

  @ApiPropertyOptional({ example: 'Working at height - safety harness required' })
  @Expose()
  safetyConcerns?: string;

  @ApiPropertyOptional({ example: 'Recommend additional mounting brackets' })
  @Expose()
  recommendations?: string;

  @ApiPropertyOptional({
    example: [{ fileName: 'roof_view_1.jpg', fileUrl: 'https://...' }],
    type: 'array',
  })
  @Expose()
  photos?: FileAttachment[];

  @ApiPropertyOptional({
    example: [{ fileName: 'electrical_report.pdf', fileUrl: 'https://...' }],
    type: 'array',
  })
  @Expose()
  documents?: FileAttachment[];

  @ApiPropertyOptional({ example: 'Survey completed successfully' })
  @Expose()
  notes?: string;

  @ApiProperty({ example: '2025-02-05T10:30:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-05T16:20:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  @Expose()
  deletedAt?: Date;
}
