import { Controller, Get, HttpStatus, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { resolveDashboardSubjectId } from '../../iam/constants/admin-roles';
import { IamService } from '../../iam/services/iam.service';
import { MyWorkResponseDto } from '../dto/dashboard-response.dto';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
// There is NO global auth guard in this app — app.module.ts registers only
// ThrottlerGuard. Without this line the endpoint is public.
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly iamService: IamService,
  ) {}

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
    // No parameter is the overwhelmingly common case — the first screen after
    // login, for everyone. It costs nothing extra: we never look the caller's
    // permissions up, because there is no decision to make.
    if (!userId) {
      return this.dashboardService.getMyWork(currentUser.id);
    }

    // Deliberately NOT `currentUser.permissions`. That list is baked into the
    // JWT at login, while the web app gates the selector on the fresh list from
    // /auth/me (see `refreshUser` in auth-provider.tsx). Reading the token here
    // meant that for the whole life of an access token after a grant, the
    // dropdown appeared and the parameter was silently ignored — the page then
    // showed the CALLER's own name and numbers under someone else's selection.
    // `getUserPermissions` is the same function /auth/me uses, so the gate and
    // this check now read one source and cannot drift.
    const permissions = await this.iamService.getUserPermissions(currentUser.id);

    const subjectId = resolveDashboardSubjectId(
      currentUser.roles,
      permissions,
      currentUser.id,
      { userId },
    );

    return this.dashboardService.getMyWork(subjectId);
  }
}
