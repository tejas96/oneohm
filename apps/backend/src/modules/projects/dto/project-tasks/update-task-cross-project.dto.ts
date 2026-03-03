import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type TaskChecklist, TaskPriority, TaskStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  IsObject,
} from 'class-validator';

/**
 * DTO for updating a task from the cross-project "My Tasks" context.
 * Supports a subset of fields that an assignee/team member can change
 * without navigating to the full project task board.
 */
export class UpdateTaskCrossProjectDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'User ID to assign, or null to unassign',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string | null;

  @ApiPropertyOptional({ example: 'Updated description text' })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 75 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  completionPercentage?: number;

  @ApiPropertyOptional({ description: 'Updated checklist (full replacement)' })
  @IsObject()
  @IsOptional()
  checklist?: TaskChecklist;

  @ApiPropertyOptional({
    description: 'IDs of tasks this task depends on (max 50)',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  dependsOnTaskIds?: string[];

  @ApiPropertyOptional({ description: 'Expected version for optimistic locking' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  version?: number;
}

export class AddCommentDto {
  @ApiProperty({ example: 'Started working on the wiring section' })
  @IsString()
  @MaxLength(2000)
  comment!: string;
}
