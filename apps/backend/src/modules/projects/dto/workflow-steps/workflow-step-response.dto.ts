import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type TaskChecklist } from '@tejas96/shared/types';
import { Expose, Transform } from 'class-transformer';

export class WorkflowStepResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;


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

  @ApiPropertyOptional({ description: 'Default milestone name for tasks from this step' })
  @Expose()
  defaultMilestoneName?: string | null;

  @ApiPropertyOptional({ description: 'Default milestone order (sort key)' })
  @Expose()
  defaultMilestoneOrder?: number | null;

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
  effortDays?: number;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  checklistTemplate?: TaskChecklist;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  isSpecial!: boolean;

  @ApiPropertyOptional()
  @Expose()
  changeRequestType?: string;

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
