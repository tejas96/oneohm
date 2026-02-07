import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';

/**
 * MoveTaskDto
 * DTO for Kanban drag-drop task movement with optimistic locking
 */
export class MoveTaskDto {
  @ApiProperty({
    description: 'New task status after move',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status!: TaskStatus;

  @ApiProperty({
    description: 'New kanban order position within the status column',
    example: 1000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  kanbanOrder!: number;

  @ApiProperty({
    description: 'Expected version for optimistic locking (prevents concurrent update conflicts)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version!: number;
}
