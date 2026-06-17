import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, TaskStatus } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TaskStatusConfigDto {
  @ApiProperty({ enum: Object.values(TaskStatus), description: 'Task status code' })
  @IsEnum(TaskStatus)
  code!: TaskStatus;

  @ApiProperty({ example: 'Backlog', description: 'Display label for the status' })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ example: '#6B7280', description: 'Hex color for the status column' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #6B7280)' })
  color!: string;

  @ApiProperty({ example: 1, description: 'Sort order index (1-based)' })
  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ConvertTeamMemberDto {
  @ApiProperty({ description: 'User ID to assign as team member' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Role name for this team member in the project' })
  @IsString()
  roleName!: string;

  @ApiPropertyOptional({ description: 'Whether this member is the project manager' })
  @IsOptional()
  @IsBoolean()
  isProjectManager?: boolean;
}

export class TaskAssignmentOverrideDto {
  @ApiProperty({ description: 'Workflow step ID to override assignment for' })
  @IsUUID()
  workflowStepId!: string;

  @ApiProperty({ description: 'User ID to assign the task to' })
  @IsUUID()
  assignedToUserId!: string;
}

export class TaskMilestoneOverrideDto {
  @ApiProperty({ description: 'Workflow step ID to override milestone for' })
  @IsUUID()
  workflowStepId!: string;

  @ApiPropertyOptional({
    description: 'Milestone name to assign to this task (null to clear)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  milestoneName!: string | null;

  @ApiPropertyOptional({
    description: 'Milestone order (sort key) — null to clear',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  milestoneOrder!: number | null;
}

export class MilestoneInputDto {
  @ApiProperty({ description: 'Milestone display name', example: 'Installation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Sequence order (1-based)', example: 6 })
  @IsNumber()
  @Min(1)
  order!: number;
}

export class ConvertFromQuoteDto {
  @ApiPropertyOptional({ description: 'Override auto-generated project name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project Manager user ID' })
  @IsOptional()
  @IsUUID()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'Team members to assign', type: [ConvertTeamMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertTeamMemberDto)
  teamMembers?: ConvertTeamMemberDto[];

  @ApiPropertyOptional({ description: 'Project start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Project end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project priority', enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiPropertyOptional({ description: 'Workflow step IDs to exclude from auto-creation' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludedStepIds?: string[];

  @ApiPropertyOptional({
    description: 'Explicit task assignments (sole assignment path — no auto-assignment)',
    type: [TaskAssignmentOverrideDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssignmentOverrideDto)
  taskAssignments?: TaskAssignmentOverrideDto[];

  @ApiPropertyOptional({
    description: 'Task milestone mapping overrides',
    type: [TaskMilestoneOverrideDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskMilestoneOverrideDto)
  taskMilestoneOverrides?: TaskMilestoneOverrideDto[];

  @ApiPropertyOptional({
    description: 'Custom milestones (overrides defaults)',
    type: [MilestoneInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneInputDto)
  milestones?: MilestoneInputDto[];

  @ApiPropertyOptional({
    description:
      'Task status configuration for this project (pre-filled from default_task_status lookup)',
    type: [TaskStatusConfigDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one task status is required' })
  @ValidateNested({ each: true })
  @Type(() => TaskStatusConfigDto)
  taskStatuses?: TaskStatusConfigDto[];
}
