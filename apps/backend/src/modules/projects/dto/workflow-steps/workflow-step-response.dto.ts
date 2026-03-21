import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type MilestoneType, type TaskChecklist } from '@oneohm-epc/shared/types';
import { Expose, Transform } from 'class-transformer';

export class WorkflowStepResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  organizationId!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  code!: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiPropertyOptional()
  @Expose()
  type?: string;

  @ApiPropertyOptional()
  @Expose()
  defaultDepartment?: string;

  @ApiPropertyOptional()
  @Expose()
  defaultRoleCode?: string;

  @ApiPropertyOptional()
  @Expose()
  defaultMilestoneType?: MilestoneType | null;

  @ApiProperty()
  @Expose()
  sequenceOrder!: number;

  @ApiProperty()
  @Expose()
  isMandatory!: boolean;

  @ApiProperty()
  @Expose()
  canRunParallel!: boolean;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  dependsOnTaskCodes?: string[];

  @ApiPropertyOptional()
  @Expose()
  estimatedDurationHours?: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  checklistTemplate?: TaskChecklist;

  @ApiPropertyOptional()
  @Expose()
  allowedTransitions?: Record<string, string[]>;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional()
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;
}
