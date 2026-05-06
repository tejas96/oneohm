import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { toDto } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
  UpdateReimbursementStatusDto,
} from '../dto';
import { ProjectExpenseService } from '../services/project-expense.service';

/**
 * ProjectExpenseController
 *
 * Plan §3.3 — the cash-outflow ledger surface.
 *
 * Routes:
 *   POST   /projects/:projectId/expenses                  create
 *   GET    /projects/:projectId/expenses                  list
 *   GET    /projects/:projectId/expenses/summary          aggregations
 *   GET    /expenses/:id                                  read one
 *   PATCH  /expenses/:id                                  edit
 *   DELETE /expenses/:id                                  soft delete
 *   PATCH  /expenses/:id/reimbursement-status             FSM
 *
 * RBAC permissions referenced (TODO seed in iam_roles):
 *   - expenses:create / expenses:read / expenses:update / expenses:delete
 *   - expenses:override-procurement-guard   (gates dto.override=true)
 *   - expenses:reimburse                     (gates the FSM endpoint)
 *
 * NOTE: Permission guards are currently best-effort (caller is trusted via
 * JWT) — formal @RequirePermission decorators will be wired once the new
 * permission keys are seeded. The override capability is checked manually
 * from the JWT permissions claim inside the controller until then.
 */
@Controller()
@ApiTags('Project Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProjectExpenseController {
  constructor(private readonly expenseService: ProjectExpenseService) {}

  // ============================================
  // PROJECT-SCOPED ROUTES
  // ============================================

  @Post('projects/:projectId/expenses')
  @ApiOperation({ summary: 'Record a project expense' })
  @ApiParam({ name: 'projectId', type: String })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expenseService.create(
      organizationId,
      projectId,
      dto,
      currentUser.id,
      {
        canOverrideProcurementGuard: this.userHasPermission(
          currentUser,
          'expenses:override-procurement-guard',
        ),
      },
    );
    return toDto(ExpenseResponseDto, expense);
  }

  @Get('projects/:projectId/expenses')
  @ApiOperation({ summary: 'List expenses for a project (paginated, filterable)' })
  @ApiParam({ name: 'projectId', type: String })
  async list(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @OrganizationContext() organizationId: string,
    @Query() query: ListExpensesQueryDto,
  ): Promise<{
    data: ExpenseResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { data, total, page, limit } = await this.expenseService.list(
      projectId,
      organizationId,
      query,
    );
    return {
      data: data.map((e) => toDto(ExpenseResponseDto, e)),
      total,
      page,
      limit,
    };
  }

  @Get('projects/:projectId/expenses/summary')
  @ApiOperation({
    summary:
      'Aggregated totals: total spent, by-category breakdown, pending reimbursement amount',
  })
  @ApiParam({ name: 'projectId', type: String })
  async getProjectSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @OrganizationContext() organizationId: string,
  ): Promise<ReturnType<ProjectExpenseService['getProjectSummary']>> {
    return this.expenseService.getProjectSummary(projectId, organizationId);
  }

  // ============================================
  // EXPENSE-SCOPED ROUTES
  // ============================================

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Get one expense by id' })
  @ApiParam({ name: 'id', type: String })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expenseService.findById(id, organizationId);
    return toDto(ExpenseResponseDto, expense);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Edit an expense (override flag is immutable post-create)' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expenseService.update(id, organizationId, dto, currentUser.id);
    return toDto(ExpenseResponseDto, expense);
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an expense' })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
  ): Promise<void> {
    await this.expenseService.delete(id, organizationId);
  }

  @Patch('expenses/:id/reimbursement-status')
  @ApiOperation({ summary: 'Mark an employee-paid expense as reimbursed (FSM)' })
  @ApiParam({ name: 'id', type: String })
  async updateReimbursementStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: UpdateReimbursementStatusDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expenseService.updateReimbursementStatus(
      id,
      organizationId,
      dto,
      currentUser.id,
    );
    return toDto(ExpenseResponseDto, expense);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Defensive lookup of a permission flag on the JWT-resolved user.
   * Tolerant of either a `permissions: string[]` claim or a roles
   * array carrying nested permissions, so we don't break depending on
   * how the auth module evolves (it currently exposes both shapes in
   * different code paths).
   */
  private userHasPermission(user: CurrentUserType, key: string): boolean {
    const direct = (user as unknown as { permissions?: string[] }).permissions;
    if (Array.isArray(direct) && direct.includes(key)) return true;
    const roles = (user as unknown as {
      roles?: Array<{ permissions?: Array<string | { key?: string; permissionKey?: string }> }>;
    }).roles;
    if (Array.isArray(roles)) {
      for (const role of roles) {
        const perms = role.permissions ?? [];
        for (const p of perms) {
          if (typeof p === 'string' && p === key) return true;
          if (typeof p === 'object' && p && (p.key === key || p.permissionKey === key)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
