import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority } from '@oneohm-epc/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

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

  @ApiProperty({
    description: 'Target milestone order (sequenceOrder) -- 0 means unmap from all milestones',
  })
  @IsNumber()
  @Min(0)
  milestoneOrder!: number;
}

export class MilestoneInputDto {
  @ApiProperty({ description: 'Milestone name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Milestone type (MilestoneType enum value)' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: 'Sequence order (1-based)' })
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
}
