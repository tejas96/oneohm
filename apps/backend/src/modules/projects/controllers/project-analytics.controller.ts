import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { ProjectSummaryResponseDto } from '../dto/analytics';
import { ProjectAnalyticsService } from '../services/project-analytics.service';

@ApiTags('Project Analytics')
@Controller('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProjectAnalyticsController {
  constructor(private readonly analyticsService: ProjectAnalyticsService) {}

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

  // Future: org-wide analytics for dashboard
  // @Get('analytics/overview')
  // @ApiOperation({ summary: 'Get org-wide project analytics overview' })
  // async getOrgOverview(@OrganizationContext() organizationId: string) { ... }
}
