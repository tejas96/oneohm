import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
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
   * The subject is the token holder. FULL STOP.
   *
   * This endpoint deliberately takes no employee/user parameter. Backend RBAC
   * does not exist in this app yet, so a parameter here would be an unguarded
   * "show me anyone's work" switch. When the admin employee selector arrives it
   * adds a parameter AND the permission check that governs it, together.
   */
  @Get('my-work')
  @ApiOperation({ summary: "Everything needing the signed-in employee's attention" })
  @ApiResponse({ status: HttpStatus.OK, type: MyWorkResponseDto })
  async getMyWork(@CurrentUser() currentUser: CurrentUserType): Promise<MyWorkResponseDto> {
    return this.dashboardService.getMyWork(currentUser.id);
  }
}
