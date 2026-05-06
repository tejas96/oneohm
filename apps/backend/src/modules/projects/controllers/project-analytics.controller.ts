import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { ProjectSummaryResponseDto } from '../dto/analytics';
import { MilestoneAggregateDto, RenameMilestoneDto } from '../dto/projects/milestone-aggregate.dto';
import { ProjectAnalyticsService } from '../services/project-analytics.service';
import { ProjectTaskService } from '../services/project-task.service';

@ApiTags('Project Analytics')
@Controller('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProjectAnalyticsController {
  constructor(
    private readonly analyticsService: ProjectAnalyticsService,
    private readonly taskService: ProjectTaskService,
  ) {}

  @Get(':id/analytics/summary')
  @ApiOperation({
    summary: 'Get project summary dashboard data',
    description:
      'Returns aggregated analytics for a project: task metrics, status/priority breakdowns, recent activity, team workload, and milestone progress.',
  })
  async getProjectSummary(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectSummaryResponseDto> {
    return this.analyticsService.getProjectSummary(id, organizationId);
  }

  @Get(':id/milestones')
  @ApiOperation({
    summary: 'Get milestone aggregates for a project',
    description:
      'Returns one row per distinct milestone group, computed live from project_tasks. Cancelled tasks excluded from all counts.',
  })
  async getMilestones(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MilestoneAggregateDto[]> {
    return this.analyticsService.getMilestoneAggregates(id, organizationId);
  }

  @Patch(':id/milestones/rename')
  @ApiOperation({
    summary: 'Rename a milestone group across all tasks in a project',
    description:
      'Atomically updates milestone_name (and optionally milestone_order) for all tasks in the group. Covers wizard "rename" and post-creation rename.',
  })
  async renameMilestone(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameMilestoneDto,
  ): Promise<{ affected: number }> {
    await this.analyticsService.ensureProjectAccess(id, organizationId);
    return this.taskService.renameMilestone(id, body.from, body.to, body.order);
  }
}
