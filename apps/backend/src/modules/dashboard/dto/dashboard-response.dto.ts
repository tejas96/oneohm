import { ApiProperty } from '@nestjs/swagger';
import type { DashboardSection, DashboardSummary, MyWorkResponse } from '@tejas96/shared/types';

class DashboardSummaryDto implements DashboardSummary {
  @ApiProperty({ example: 7 })
  overdue!: number;

  @ApiProperty({ example: 5 })
  dueToday!: number;

  @ApiProperty({ example: 9 })
  dueThisWeek!: number;
}

class DashboardSectionsDto {
  @ApiProperty({ description: 'Lead to project stalls' })
  workflow!: DashboardSection;

  @ApiProperty()
  followups!: DashboardSection;

  @ApiProperty()
  service!: DashboardSection;

  @ApiProperty()
  projects!: DashboardSection;

  @ApiProperty({ description: 'Outstanding payment milestones' })
  finance!: DashboardSection;
}

export class MyWorkResponseDto implements MyWorkResponse {
  @ApiProperty({ example: '2026-08-21T09:00:00.000Z' })
  generatedAt!: string;

  @ApiProperty({ type: DashboardSummaryDto })
  summary!: DashboardSummaryDto;

  @ApiProperty({
    type: DashboardSectionsDto,
    description:
      'Each section is either { status: "ok", total, criticalCount, buckets } or { status: "error", message }.',
  })
  sections!: DashboardSectionsDto;
}
