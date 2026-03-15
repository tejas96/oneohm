import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MilestoneStatus,
  MilestoneType,
  type MilestoneDeliverable,
} from '@oneohm-epc/shared/types';
import { Expose } from 'class-transformer';

/**
 * Milestone Response DTO
 * Serialized response for milestone entities
 */
export class MilestoneResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiPropertyOptional({ example: 'MS-ONEOHM_EPC-2026-0001' })
  @Expose()
  milestoneCode?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  assignedTo?: string;

  @ApiProperty({ example: 'Site Survey Completion' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: 'Complete detailed site assessment' })
  @Expose()
  description?: string;

  @ApiProperty({
    enum: Object.values(MilestoneType),
    enumName: 'MilestoneType',
    example: MilestoneType.SITE_SURVEY,
  })
  @Expose()
  milestoneType!: MilestoneType;

  @ApiProperty({
    enum: Object.values(MilestoneStatus),
    enumName: 'MilestoneStatus',
    example: MilestoneStatus.IN_PROGRESS,
  })
  @Expose()
  status!: MilestoneStatus;

  @ApiProperty({ example: 1 })
  @Expose()
  sequenceOrder!: number;

  @ApiProperty({ example: 45 })
  @Expose()
  progressPercentage!: number;

  @ApiPropertyOptional({ example: '2025-02-01' })
  @Expose()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2025-02-05' })
  @Expose()
  endDate?: Date;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @Expose()
  dependencies?: string[];

  @ApiPropertyOptional({
    example: [{ name: 'Site Survey Report', type: 'document', isCompleted: true }],
    type: 'array',
  })
  @Expose()
  deliverables?: MilestoneDeliverable[];

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-04T14:20:00Z' })
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
