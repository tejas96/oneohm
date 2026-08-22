import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkloadQueryDto, type WorkloadResponseDto } from './dto/workload.dto';
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
}
