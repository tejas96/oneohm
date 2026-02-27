import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { TaskStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

import { CreateProjectTaskDto } from './create-project-task.dto';

export class UpdateProjectTaskDto extends PartialType(OmitType(CreateProjectTaskDto, ['status'] as const)) {
  @ApiPropertyOptional({ description: 'Expected version for optimistic locking' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  version?: number;
}

export class AssignTaskDto {
  @ApiProperty({
    description: 'User ID to assign, or null to unassign',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assignedToUserId!: string | null;
}

export class UpdateTaskStatusDto {
  @ApiProperty({
    description: 'New task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}

export class UpdateTaskProgressDto {
  @ApiProperty({ description: 'Completion percentage (0-100)', example: 50 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  completionPercentage!: number;
}
