import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type TaskChecklist, ChangeRequestType, WorkflowStepType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkflowStepDto {
  @ApiProperty({ description: 'Step name', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Step code', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @ApiPropertyOptional({ description: 'Step description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Which department owns this step', enum: WorkflowStepType })
  @IsEnum(WorkflowStepType)
  @IsOptional()
  type?: WorkflowStepType | null;

  @ApiPropertyOptional({ description: 'Default department' })
  @IsString()
  @IsOptional()
  defaultDepartment?: string;

  @ApiPropertyOptional({ description: 'Default role code' })
  @IsString()
  @IsOptional()
  defaultRoleCode?: string;

  @ApiPropertyOptional({
    description: 'Default milestone name for tasks created from this step',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  defaultMilestoneName?: string | null;

  @ApiPropertyOptional({ description: 'Default milestone order (sort key)', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  defaultMilestoneOrder?: number | null;

  @ApiProperty({ description: 'Sequence order', minimum: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  sequenceOrder!: number;

  @ApiPropertyOptional({ description: 'Is mandatory', default: true })
  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'Can run in parallel', default: false })
  @IsBoolean()
  @IsOptional()
  canRunParallel?: boolean;

  @ApiPropertyOptional({ description: 'Depends on task codes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependsOnTaskCodes?: string[];

  @ApiPropertyOptional({ description: 'Estimated effort in days', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  effortDays?: number;

  @ApiPropertyOptional({ description: 'Checklist template' })
  @IsObject()
  @IsOptional()
  checklistTemplate?: TaskChecklist;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Marks a change-request template. These are not part of a new project; they are created only when a property has a pending request of the matching type.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSpecial?: boolean;

  @ApiPropertyOptional({
    description: 'Which change request this template serves. Required when isSpecial is set.',
    enum: ChangeRequestType,
  })
  @IsEnum(ChangeRequestType)
  @IsOptional()
  changeRequestType?: ChangeRequestType | null;
}
