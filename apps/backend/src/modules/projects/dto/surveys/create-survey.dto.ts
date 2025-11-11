import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoofCondition,
  RoofOrientation,
  SiteSurveyStatus,
  type ElectricalDetails,
  type FileAttachment,
  type ShadingAnalysis,
} from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new site survey
 */
export class CreateSurveyDto {
  // ==================== Relations ====================
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project ID',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Surveyor/technician user ID',
  })
  @IsUUID()
  @IsOptional()
  surveyorId?: string;

  // ==================== Survey Info ====================
  @ApiProperty({
    example: '2025-02-05T09:00:00Z',
    description: 'Date and time of the survey',
  })
  @IsDateString()
  @IsNotEmpty()
  surveyDate!: string;

  @ApiPropertyOptional({
    enum: Object.values(SiteSurveyStatus),
    enumName: 'SiteSurveyStatus',
    example: SiteSurveyStatus.SCHEDULED,
    description: 'Survey status',
    default: SiteSurveyStatus.SCHEDULED,
  })
  @IsEnum(SiteSurveyStatus)
  @IsOptional()
  status?: SiteSurveyStatus;

  // ==================== Roof Details ====================
  @ApiPropertyOptional({
    example: 'Concrete flat roof',
    description: 'Type of roof',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  roofType?: string;

  @ApiPropertyOptional({
    enum: Object.values(RoofCondition),
    enumName: 'RoofCondition',
    example: RoofCondition.GOOD,
    description: 'Condition of the roof',
  })
  @IsEnum(RoofCondition)
  @IsOptional()
  roofCondition?: RoofCondition;

  @ApiPropertyOptional({
    enum: Object.values(RoofOrientation),
    enumName: 'RoofOrientation',
    example: RoofOrientation.SOUTH,
    description: 'Primary orientation of the roof',
  })
  @IsEnum(RoofOrientation)
  @IsOptional()
  roofOrientation?: RoofOrientation;

  @ApiPropertyOptional({
    example: 15.5,
    description: 'Roof tilt angle in degrees',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  roofTiltAngle?: number;

  @ApiPropertyOptional({
    example: 85.5,
    description: 'Available roof area in square meters',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  availableAreaSqm?: number;

  // ==================== Site Analysis ====================
  @ApiPropertyOptional({
    example: {
      hasShading: true,
      shadingPercentage: 15,
      shadingSource: ['trees', 'adjacent building'],
      mitigationRequired: false,
    },
    description: 'Shading analysis results',
  })
  @IsObject()
  @IsOptional()
  shadingAnalysis?: ShadingAnalysis;

  @ApiPropertyOptional({
    example: {
      panelType: 'MCB',
      panelCapacity: 60,
      voltage: 240,
      phaseType: 'single',
      distanceToPanel: 15,
    },
    description: 'Electrical system details',
  })
  @IsObject()
  @IsOptional()
  electricalDetails?: ElectricalDetails;

  @ApiPropertyOptional({
    example: 'Roof structure is sound, no repairs needed',
    description: 'Structural assessment notes',
  })
  @IsString()
  @IsOptional()
  structuralAssessment?: string;

  @ApiPropertyOptional({
    example: 'Easy access via external staircase',
    description: 'Site access description',
  })
  @IsString()
  @IsOptional()
  siteAccess?: string;

  @ApiPropertyOptional({
    example: 'Working at height - safety harness required',
    description: 'Safety concerns or requirements',
  })
  @IsString()
  @IsOptional()
  safetyConcerns?: string;

  @ApiPropertyOptional({
    example: 'Recommend additional mounting brackets for wind load',
    description: 'Recommendations from survey',
  })
  @IsString()
  @IsOptional()
  recommendations?: string;

  // ==================== Attachments ====================
  @ApiPropertyOptional({
    example: [
      {
        fileName: 'roof_view_1.jpg',
        fileUrl: 'https://storage.example.com/surveys/roof1.jpg',
        fileSize: 2048000,
        mimeType: 'image/jpeg',
      },
    ],
    description: 'Survey photos',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  photos?: FileAttachment[];

  @ApiPropertyOptional({
    example: [
      {
        fileName: 'electrical_report.pdf',
        fileUrl: 'https://storage.example.com/surveys/electrical.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
      },
    ],
    description: 'Survey documents',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  documents?: FileAttachment[];

  // ==================== Additional Data ====================
  @ApiPropertyOptional({
    example: 'Customer requests installation to start ASAP',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
