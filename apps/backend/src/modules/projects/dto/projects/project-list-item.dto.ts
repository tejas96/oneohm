import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProjectPriority,
  ProjectStatus,
  type ProjectMetadata,
  type QuoteSnapshot,
  type TaskStatusConfig,
} from '@tejas96/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

const latestQuoteVersion = (obj: Record<string, unknown>) =>
  (obj.quote as { versions?: Array<Record<string, unknown>> } | undefined)?.versions?.[0];

class ProjectListPropertyDto {
  @Expose()
  id!: string;

  @Expose()
  address?: string;

  @Expose()
  city?: string;

  @Expose()
  state?: string;

  @Expose()
  pincode?: string;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.customer) return undefined;
    const firstName = obj.customer.firstName || '';
    const lastName = obj.customer.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  customerName?: string;
}

class ProjectListTeamMemberDto {
  @Expose()
  @Transform(({ obj }) => obj.user?.id ?? obj.userId)
  id!: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.firstName ?? '')
  firstName!: string;

  @Expose()
  @Transform(({ obj }) => obj.user?.lastName ?? undefined)
  lastName?: string;

  @Expose()
  isProjectManager!: boolean;
}

class PaymentSummaryDto {
  @Expose()
  totalExpected!: number;

  @Expose()
  totalPaid!: number;
}

class ProjectListItemNextTaskDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Perform Site Audit' })
  @Expose()
  name!: string;

  @ApiProperty({ example: 'site_audit' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @Expose()
  endDate?: Date;
}

/**
 * Lightweight DTO for the project list view.
 * Avoids loading full milestones/surveys/materials.
 * Includes computed fields: paymentSummary, currentPhase, healthStatus.
 */
export class ProjectListItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'PRJ-ONEOHM-2025-0001' })
  @Expose()
  projectNumber!: string;

  @ApiProperty({ example: 'Smith Residence Solar' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: '10kW rooftop solar installation' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'FK to the source quote' })
  @Expose()
  quoteId!: string;

  @ApiProperty({ example: 'Q-ONEOHM-2025-0001', description: 'Derived from quote relation' })
  @Expose()
  @Transform(({ obj }) => obj.quote?.quoteNumber)
  quoteNumber?: string;

  @ApiProperty({ example: 10, description: 'Derived from latest quote version' })
  @Expose()
  @Transform(({ obj }) => toNum(latestQuoteVersion(obj)?.systemSizeKw))
  systemSizeKw!: number;

  @ApiPropertyOptional({
    example: 10.08,
    description: 'Actual system size from quote snapshot calculation',
  })
  @Expose()
  @Transform(({ obj }) => {
    const snapshot = latestQuoteVersion(obj)?.quoteSnapshot as QuoteSnapshot | undefined;
    const val = toNum(snapshot?.calculation?.actualSystemSizeKw);
    return val != null && val > 0 ? val : undefined;
  })
  actualSystemSizeKw?: number;

  @ApiProperty({ example: 'residential', description: 'Derived from latest quote version' })
  @Expose()
  @Transform(({ obj }) => latestQuoteVersion(obj)?.projectType)
  projectType!: string;

  @ApiProperty({ enum: Object.values(ProjectStatus), example: ProjectStatus.ACTIVE })
  @Expose()
  status!: ProjectStatus;

  @ApiProperty({ enum: Object.values(ProjectPriority), example: ProjectPriority.NORMAL })
  @Expose()
  priority!: ProjectPriority;

  @ApiProperty({ example: 65 })
  @Expose()
  progressPercentage!: number;

  @ApiProperty({ example: 42 })
  @Expose()
  totalTasks!: number;

  @ApiProperty({ example: 10 })
  @Expose()
  completedTasks!: number;

  @ApiPropertyOptional({ example: '2025-02-01' })
  @Expose()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @Expose()
  endDate?: Date;

  @ApiPropertyOptional({ example: 450000, description: 'Derived from latest quote version' })
  @Expose()
  @Transform(({ obj }) => toNum(latestQuoteVersion(obj)?.finalPrice) ?? null)
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 425000, description: 'Derived from metadata.actualCost' })
  @Expose()
  @Transform(({ obj }) => toNum(obj.metadata?.actualCost) ?? null)
  actualCost?: number;

  @ApiPropertyOptional()
  @Expose()
  metadata?: ProjectMetadata;

  @ApiPropertyOptional({ description: 'Configured task statuses for this project' })
  @Expose()
  taskStatuses?: TaskStatusConfig[];

  @ApiProperty({ type: () => ProjectListPropertyDto })
  @Expose()
  @Type(() => ProjectListPropertyDto)
  property!: ProjectListPropertyDto;

  @ApiProperty({ type: () => [ProjectListTeamMemberDto] })
  @Expose()
  @Type(() => ProjectListTeamMemberDto)
  teamMembers!: ProjectListTeamMemberDto[];

  @ApiProperty({ type: () => PaymentSummaryDto })
  @Expose()
  paymentSummary!: PaymentSummaryDto;

  @ApiPropertyOptional({
    example: 'Installation',
    description:
      'Current milestone phase name — the lowest-order milestone group with any non-done task',
  })
  @Expose()
  currentPhase!: string | null;

  @ApiPropertyOptional({
    example: 'on_track',
    enum: ['on_track', 'at_risk', 'delayed'],
    description: 'Computed health status based on due date and progress',
  })
  @Expose()
  healthStatus!: 'on_track' | 'at_risk' | 'delayed' | null;

  @ApiPropertyOptional({ type: ProjectListItemNextTaskDto })
  @Expose()
  @Type(() => ProjectListItemNextTaskDto)
  nextTask?: ProjectListItemNextTaskDto | null;

  @ApiPropertyOptional({ example: 2 })
  @Expose()
  userOverdueTasks?: number;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-15T14:20:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  /**
   * Open or in-progress service tickets. Drives the active-tickets chip on the
   * projects list.
   */
  @ApiProperty({ description: 'Number of open or in-progress service tickets' })
  @Expose()
  @Transform(({ obj }) => obj.activeTicketCount ?? 0)
  activeTicketCount!: number;

  @ApiPropertyOptional({ description: 'Name of the user who created this project' })
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.creator) return undefined;
    const firstName = obj.creator.firstName || '';
    const lastName = obj.creator.lastName || '';
    return `${firstName} ${lastName}`.trim() || undefined;
  })
  creatorName?: string;
}
