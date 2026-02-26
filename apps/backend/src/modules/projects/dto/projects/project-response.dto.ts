import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, ProjectStatus, type ProjectMetadata } from '@oneohm-epc/shared-types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';
import { CustomerPropertyResponseDto } from '../../../customers/dto/customer-property-response.dto';
import { MaterialResponseDto } from '../materials/material-response.dto';
import { MilestoneResponseDto } from '../milestones/milestone-response.dto';
import { SurveyResponseDto } from '../surveys/survey-response.dto';

/**
 * Project Response DTO
 *
 * Fields systemSizeKw, projectType, estimatedCost, quoteNumber are derived
 * from the joined quote relation via @Transform.
 * actualCost is derived from metadata.actualCost.
 */
export class ProjectResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Property ID (customer/org/address derived from property)' })
  @Expose()
  propertyId!: string;

  @ApiProperty({ type: () => CustomerPropertyResponseDto })
  @Expose()
  @Type(() => CustomerPropertyResponseDto)
  property!: CustomerPropertyResponseDto;

  @ApiProperty({ description: 'FK to the source quote' })
  @Expose()
  quoteId!: string;

  @ApiProperty({ example: 'Q-ONEOHM-2025-0001', description: 'Derived from quote relation' })
  @Expose()
  @Transform(({ obj }) => obj.quote?.quoteNumber)
  quoteNumber?: string;

  @ApiProperty()
  @Expose()
  createdBy!: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;

  @ApiProperty({ example: 'PRJ-ONEOHM-2025-0001' })
  @Expose()
  projectNumber!: string;

  @ApiProperty({ example: 'Solar Installation - Smith Residence' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: '5kW rooftop solar installation' })
  @Expose()
  description?: string;

  @ApiProperty({ example: 5.5, description: 'Derived from quote current version' })
  @Expose()
  @Transform(({ obj }) => toNum(obj.quote?.versions?.find((v: any) => v.isCurrent)?.systemSizeKw))
  systemSizeKw!: number;

  @ApiProperty({ example: 'residential', description: 'Derived from quote current version' })
  @Expose()
  @Transform(({ obj }) => obj.quote?.versions?.find((v: any) => v.isCurrent)?.projectType)
  projectType!: string;

  @ApiProperty({ enum: Object.values(ProjectStatus), example: ProjectStatus.IN_PROGRESS })
  @Expose()
  status!: ProjectStatus;

  @ApiProperty({ enum: Object.values(ProjectPriority), example: ProjectPriority.NORMAL })
  @Expose()
  priority!: ProjectPriority;

  @ApiProperty({ example: 45 })
  @Expose()
  progressPercentage!: number;

  @ApiPropertyOptional({ example: '2025-02-01' })
  @Expose()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @Expose()
  endDate?: Date;

  @ApiPropertyOptional({ example: 350000, description: 'Derived from quote current version' })
  @Expose()
  @Transform(({ obj }) => toNum(obj.quote?.versions?.find((v: any) => v.isCurrent)?.finalPrice) ?? null)
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 325000, description: 'Derived from metadata.actualCost' })
  @Expose()
  @Transform(({ obj }) => toNum(obj.metadata?.actualCost) ?? null)
  actualCost?: number;

  @ApiPropertyOptional({ example: { tags: ['priority', 'referral'] } })
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
