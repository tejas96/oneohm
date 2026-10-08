import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProjectsDashboard, StageGroupKey, StageProjects } from '@tejas96/shared/types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { hasAdminBypassRole, resolveProjectListMemberId } from '../../iam/constants';
import {
  ProjectsDashboardQueryDto,
  StageProjectsQueryDto,
} from '../dto/dashboard/projects-dashboard-query.dto';
import { ProjectDashboardService } from '../services/project-dashboard.service';
import { istToday, resolveDashboardRange } from '../utils/dashboard-period';

const toFinancing = (v: string | undefined): 'cash' | 'loan' | null =>
  v === 'cash' || v === 'loan' ? v : null;

/**
 * The /projects portfolio dashboard. Its own controller, registered before
 * ProjectController, so `dashboard` is never read as a project `:id`.
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectDashboardController {
  constructor(private readonly dashboard: ProjectDashboardService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Projects dashboard',
    description:
      'Owner strip, projects by stage, needs action, late steps by team, 12-month trend and ' +
      'meters due — all from PROJECT_FACTS_CTE, so each figure equals the project list it links to.',
  })
  async getDashboard(
    @CurrentUser() user: CurrentUserType,
    @Query() query: ProjectsDashboardQueryDto,
  ): Promise<ProjectsDashboard> {
    const today = istToday();
    const roles = user.roles ?? [];
    const permissions = user.permissions ?? [];
    return this.dashboard.getDashboard({
      range: resolveDashboardRange(query.period ?? 'this_month', query.from, query.to, today),
      today,
      financing: toFinancing(query.financing),
      memberId: resolveProjectListMemberId(roles, permissions, user.id) ?? null,
      includeMoney: hasAdminBypassRole(roles) || permissions.includes('finance.view'),
    });
  }

  @Get('dashboard/stage-projects')
  @ApiOperation({ summary: 'Top 10 projects in one stage, most late first' })
  async getStageProjects(
    @CurrentUser() user: CurrentUserType,
    @Query() query: StageProjectsQueryDto,
  ): Promise<StageProjects> {
    return this.dashboard.getStageProjects({
      stage: query.stage as StageGroupKey | 'none',
      phase: query.phase ?? null,
      financing: toFinancing(query.financing),
      memberId:
        resolveProjectListMemberId(user.roles ?? [], user.permissions ?? [], user.id) ?? null,
    });
  }
}
