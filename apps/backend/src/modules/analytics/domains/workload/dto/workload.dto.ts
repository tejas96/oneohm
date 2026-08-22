import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The four the client asked for, plus the one their CSV omits. */
export const WORKLOAD_DEPARTMENTS = [
  'Execution Department',
  'Liaisoning Department',
  'Loan Department',
  'Store Department',
  'Design Engineering',
] as const;

export class WorkloadQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'YYYY-MM-DD. Scopes COMPLETED only.' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'fromDate must be YYYY-MM-DD' })
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-08-22', description: 'YYYY-MM-DD. Scopes COMPLETED only.' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'toDate must be YYYY-MM-DD' })
  toDate?: string;

  @ApiPropertyOptional({ enum: WORKLOAD_DEPARTMENTS })
  @IsOptional()
  @IsString()
  @IsIn(WORKLOAD_DEPARTMENTS as unknown as string[])
  department?: string;
}

export class WorkloadStepDto {
  @ApiProperty() stepId!: string;
  @ApiProperty() stepName!: string;

  @ApiProperty({ description: 'Open tasks right now. NOT scoped to the date range.' })
  pending!: number;

  @ApiProperty({ description: 'Tasks completed inside the range.' })
  completed!: number;

  @ApiProperty({ description: 'Tasks completed ever, for context on a thin range.' })
  completedAllTime!: number;

  @ApiPropertyOptional({
    description:
      'The step’s budgeted duration, from workflow_steps.effort_days — the "standard" half.',
  })
  standardDays!: number | null;

  @ApiPropertyOptional({
    description:
      'Mean age of the work still open at this step, in days — the "actual" half. Null when ' +
      'nothing is open. Measured from task creation, not from a start that is not recorded.',
  })
  avgDaysOpen!: number | null;

  @ApiPropertyOptional({ description: 'Age of the oldest open task here, in days.' })
  oldestDaysOpen!: number | null;
}

export class WorkloadBottleneckDto {
  @ApiProperty() department!: string;
  @ApiProperty() stepId!: string;
  @ApiProperty() stepName!: string;

  @ApiProperty({ description: 'Projects whose earliest incomplete step is this one.' })
  projectsStuck!: number;

  @ApiProperty({ description: 'Rupees still owed across those projects.' })
  amountOwed!: number;
}

export class WorkloadBottlenecksResponseDto {
  @ApiProperty({ type: [WorkloadBottleneckDto] })
  bottlenecks!: WorkloadBottleneckDto[];

  @ApiProperty({ description: 'Rupees owed across every blocked project, for share-of-total.' })
  totalOwed!: number;
}

export class WorkloadDepartmentDto {
  @ApiProperty() department!: string;
  @ApiProperty() pending!: number;
  @ApiProperty() completed!: number;
  @ApiProperty() completedAllTime!: number;
  @ApiProperty({ type: [WorkloadStepDto] }) steps!: WorkloadStepDto[];
}

export class WorkloadResponseDto {
  @ApiProperty() fromDate!: string;
  @ApiProperty() toDate!: string;
  @ApiProperty({ type: [WorkloadDepartmentDto] }) departments!: WorkloadDepartmentDto[];
  @ApiProperty({ description: 'Sum across departments.' }) totalPending!: number;
  @ApiProperty() totalCompleted!: number;
}
