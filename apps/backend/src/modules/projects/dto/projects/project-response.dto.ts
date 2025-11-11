import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, ProjectStatus, type GpsCoordinates, type ProjectMetadata } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

import { MaterialResponseDto } from '../materials/material-response.dto';
import { MilestoneResponseDto } from '../milestones/milestone-response.dto';
import { SurveyResponseDto } from '../surveys/survey-response.dto';

/**
 * Project Response DTO
 * Serialized response for project entities
 */
export class ProjectResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  quoteId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  customerId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectManagerId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  leadTechnicianId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  createdBy!: string;

  @ApiProperty({ example: 'PRJ-ONEOHM-2025-0001' })
  @Expose()
  projectNumber!: string;

  @ApiProperty({ example: 'Solar Installation - Smith Residence' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: '5kW rooftop solar installation' })
  @Expose()
  description?: string;

  @ApiProperty({ example: '123 Solar Street, Green City, GC 12345' })
  @Expose()
  siteAddress!: string;

  @ApiPropertyOptional({
    example: { latitude: 28.6139, longitude: 77.209 },
  })
  @Expose()
  siteCoordinates?: GpsCoordinates;

  @ApiProperty({ example: 5.5 })
  @Expose()
  systemSizeKw!: number;

  @ApiProperty({ example: 'residential' })
  @Expose()
  projectType!: string;

  @ApiProperty({
    enum: Object.values(ProjectStatus),
    enumName: 'ProjectStatus',
    example: ProjectStatus.IN_PROGRESS,
  })
  @Expose()
  status!: ProjectStatus;

  @ApiProperty({
    enum: Object.values(ProjectPriority),
    enumName: 'ProjectPriority',
    example: ProjectPriority.NORMAL,
  })
  @Expose()
  priority!: ProjectPriority;

  @ApiProperty({ example: 45 })
  @Expose()
  progressPercentage!: number;

  @ApiPropertyOptional({ example: '2025-02-01' })
  @Expose()
  plannedStartDate?: Date;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @Expose()
  plannedEndDate?: Date;

  @ApiPropertyOptional({ example: '2025-02-03' })
  @Expose()
  actualStartDate?: Date;

  @ApiPropertyOptional({ example: null })
  @Expose()
  actualEndDate?: Date;

  @ApiPropertyOptional({ example: 350000 })
  @Expose()
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 325000 })
  @Expose()
  actualCost?: number;

  @ApiPropertyOptional({ example: 'Customer requests weekend-only installation' })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({
    example: { tags: ['priority', 'referral'] },
  })
  @Expose()
  metadata?: ProjectMetadata;

  // ==================== Related Entities ====================
  @ApiPropertyOptional({ type: [MilestoneResponseDto] })
  @Expose()
  @Type(() => MilestoneResponseDto)
  milestones?: MilestoneResponseDto[];

  @ApiPropertyOptional({ type: [SurveyResponseDto] })
  @Expose()
  @Type(() => SurveyResponseDto)
  surveys?: SurveyResponseDto[];

  @ApiPropertyOptional({ type: [MaterialResponseDto] })
  @Expose()
  @Type(() => MaterialResponseDto)
  materials?: MaterialResponseDto[];

  // ==================== Timestamps ====================
  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-15T14:20:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  @Expose()
  deletedAt?: Date;
}

