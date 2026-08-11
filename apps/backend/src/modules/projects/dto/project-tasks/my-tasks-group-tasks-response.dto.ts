import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { MyTaskListItemDto } from './my-task-list-item.dto';

export class MyTasksGroupTasksResponseDto {
  @ApiProperty({ type: [MyTaskListItemDto] })
  @Expose()
  @Type(() => MyTaskListItemDto)
  tasks!: MyTaskListItemDto[];
}
