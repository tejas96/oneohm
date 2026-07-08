import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { MyTaskResponseDto } from './my-task-response.dto';

export class MyTasksProjectDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  projectNumber!: string;
}

export class MyTasksSummaryDto {
  @ApiProperty({ example: 12, description: 'Total incomplete tasks' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 2, description: 'Tasks past due date' })
  @Expose()
  overdue!: number;

  @ApiProperty({ example: 1, description: 'Tasks due today' })
  @Expose()
  dueToday!: number;

  @ApiProperty({ example: 5, description: 'Tasks completed this week (count only, not in list)' })
  @Expose()
  completedThisWeek!: number;

  @ApiProperty({
    type: [MyTasksProjectDto],
    description:
      'Projects with at least one actionable task for this user (unfiltered by list filters; excludes dependency-blocked-only projects)',
  })
  @Expose()
  @Type(() => MyTasksProjectDto)
  projects!: MyTasksProjectDto[];
}

export class MyTasksGroupDto {
  @ApiProperty({ example: 'overdue', description: 'Group key identifier' })
  @Expose()
  key!: string;

  @ApiProperty({ example: 'OVERDUE', description: 'Display label' })
  @Expose()
  label!: string;

  @ApiProperty({ example: 2, description: 'Number of tasks in this group' })
  @Expose()
  count!: number;

  @ApiProperty({
    example: 'error',
    description: 'UI variant for styling (error, warning, info, success, secondary)',
  })
  @Expose()
  variant!: string;

  @ApiProperty({ type: [MyTaskResponseDto] })
  @Expose()
  @Type(() => MyTaskResponseDto)
  tasks!: MyTaskResponseDto[];
}

export class GroupedMyTasksResponseDto {
  @ApiProperty({ type: [MyTasksGroupDto] })
  @Expose()
  @Type(() => MyTasksGroupDto)
  groups!: MyTasksGroupDto[];

  @ApiProperty({ type: MyTasksSummaryDto })
  @Expose()
  @Type(() => MyTasksSummaryDto)
  summary!: MyTasksSummaryDto;
}
