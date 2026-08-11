import { ApiProperty } from '@nestjs/swagger';
import { type TaskStatusConfig } from '@tejas96/shared/types';
import { Expose } from 'class-transformer';

export class MyTasksProjectMetaDto {
  @ApiProperty({ type: 'array' })
  @Expose()
  taskStatuses!: TaskStatusConfig[];
}
