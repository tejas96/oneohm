import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  WorkloadQueryDto,
  type WorkloadBottlenecksResponseDto,
  type WorkloadResponseDto,
} from './dto/workload.dto';
import { WorkloadService } from './workload.service';
import { JwtAuthGuard } from '../../../auth/guards';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics/workload')
// There is NO global auth guard in this app — app.module.ts registers only
// ThrottlerGuard. Without this line the endpoint is public, which is exactly
// how the sibling sales-pipeline controller shipped unauthenticated.
@UseGuards(JwtAuthGuard)
export class WorkloadController {
  constructor(private readonly workloadService: WorkloadService) {}

  @Get()
  @ApiOperation({
    summary: 'Pending and completed task counts per department and workflow step',
    description:
      'The date range scopes COMPLETED only. Pending is a count of what is open right now — ' +
      'narrowing the range must not appear to shrink the backlog.',
  })
  async getWorkload(@Query() query: WorkloadQueryDto): Promise<WorkloadResponseDto> {
    return this.workloadService.getWorkload(query);
  }

  /**
   * Which blocking step is sitting on the most unpaid money.
   *
   * A route of its own because it exposes receivables. The web gates the panel
   * on `finance.view` and simply does not call this without it — the same
   * separation the dashboard's money panels use.
   */
  @Get('bottlenecks')
  @ApiOperation({
    summary: 'Unpaid money grouped by the workflow step blocking each project',
    description:
      'A project is attributed to its earliest incomplete step. `totalOwed` covers every ' +
      'blocked project, not just the rows returned, so a share-of-total stays honest.',
  })
  async getBottlenecks(): Promise<WorkloadBottlenecksResponseDto> {
    return this.workloadService.getBottlenecks();
  }
}
