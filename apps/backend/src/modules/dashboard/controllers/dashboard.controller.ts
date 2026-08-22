import { Controller, Get, HttpStatus, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { resolveDashboardSubjectId } from '../../iam/constants/admin-roles';
import { MyWorkResponseDto } from '../dto/dashboard-response.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
// There is NO global auth guard in this app — app.module.ts registers only
// ThrottlerGuard. Without this line the endpoint is public.
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * The subject is the token holder, UNLESS the caller both sent a `userId` and
   * holds `dashboard.employees.view` — or an admin role, which bypasses.
   *
   * `resolveDashboardSubjectId` makes that decision and it does not throw. A
   * caller without the grant gets their own dashboard back and the parameter is
   * ignored, exactly as `resolveProjectListMemberId` treats `memberId` on the
   * project list. Backend RBAC still does not exist; this is subject
   * resolution, not a guard, and `scope.sql.ts` never sees the raw parameter.
   */
  @Get('my-work')
  @ApiOperation({ summary: "Everything needing an employee's attention" })
  @ApiQuery({
    name: 'userId',
    required: false,
    description:
      'Whose dashboard to read. A USER id, not an employee_profiles id. Ignored unless the caller holds dashboard.employees.view or an admin role.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MyWorkResponseDto })
  async getMyWork(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
  ): Promise<MyWorkResponseDto> {
    const subjectId = resolveDashboardSubjectId(
      currentUser.roles || [],
      currentUser.permissions || [],
      currentUser.id,
      { userId },
    );

    return this.dashboardService.getMyWork(subjectId);
  }
}
