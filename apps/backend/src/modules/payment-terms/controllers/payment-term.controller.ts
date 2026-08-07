import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { ProjectRepository } from '../../projects/repositories';
import { QuoteRepository } from '../../quotes/repositories';
import {
  CreatePaymentTermDto,
  PaymentTermResponseDto,
  UpdatePaymentTermDto,
  WaivePaymentTermDto,
} from '../dto';
import { PaymentTermService } from '../services/payment-term.service';

/**
 * PaymentTermController
 *
 * Endpoints (plan §3.1):
 *   GET    /projects/:projectId/payment-terms
 *   POST   /projects/:projectId/payment-terms
 *   POST   /projects/:projectId/payment-terms/resnapshot
 *   PATCH  /payment-terms/:id
 *   POST   /payment-terms/:id/waive
 *   DELETE /payment-terms/:id
 *
 * Two route prefixes are used because some operations are project-scoped
 * (list/create/resnapshot) and some are term-scoped (patch/waive/delete).
 * Nest supports a single @Controller decorator only, so the term-scoped
 * routes are registered via a sibling controller.
 */
@Controller()
@ApiTags('Payment Terms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PaymentTermController {
  constructor(
    private readonly termService: PaymentTermService,
    private readonly projectRepository: ProjectRepository,
    private readonly quoteRepository: QuoteRepository,
  ) {}

  // --------------------------------------------
  // Project-scoped reads & writes
  // --------------------------------------------

  @Get('projects/:projectId/payment-terms')
  @ApiOperation({ summary: 'List payment terms for a project (ordered)' })
  @ApiParam({ name: 'projectId', type: String })
  async listForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<PaymentTermResponseDto[]> {
    await this.assertProjectInOrg(projectId);
    const terms = await this.termService.listForProject(projectId);
    return toDtoArray(PaymentTermResponseDto, terms);
  }

  @Post('projects/:projectId/payment-terms')
  @ApiOperation({ summary: 'Add a new payment term mid-project' })
  @ApiParam({ name: 'projectId', type: String })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: CreatePaymentTermDto,
  ): Promise<PaymentTermResponseDto> {
    await this.assertProjectInOrg(projectId);
    const term = await this.termService.create(projectId, dto, currentUser.id);
    return toDto(PaymentTermResponseDto, term);
  }

  @Post('projects/:projectId/payment-terms/resnapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Re-snapshot terms from the latest quote version (refused if any term has received payments)',
  })
  @ApiParam({ name: 'projectId', type: String })
  async resnapshot(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PaymentTermResponseDto[]> {
    const project = await this.assertProjectInOrg(projectId);

    const quote = await this.quoteRepository.findById(project.quoteId);
    const latestVersion =
      [...(quote.versions ?? [])].sort((a, b) => {
        const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        return b.versionNumber - a.versionNumber;
      })[0] ?? null;

    const terms = await this.termService.resnapshotFromLatestQuote({
      projectId,
      sourceVersionId: latestVersion?.id ?? null,
      milestones: latestVersion?.paymentMilestones ?? [],
      updatedBy: currentUser.id,
    });
    return toDtoArray(PaymentTermResponseDto, terms);
  }

  // --------------------------------------------
  // Term-scoped writes
  // --------------------------------------------

  @Patch('payment-terms/:id')
  @ApiOperation({ summary: 'Edit a payment term (name/amount/order/due/notes)' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: UpdatePaymentTermDto,
  ): Promise<PaymentTermResponseDto> {
    const term = await this.termService.update(id, dto, currentUser.id);
    return toDto(PaymentTermResponseDto, term);
  }

  @Post('payment-terms/:id/waive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a payment term as waived (with reason)' })
  @ApiParam({ name: 'id', type: String })
  async waive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: WaivePaymentTermDto,
  ): Promise<PaymentTermResponseDto> {
    const term = await this.termService.waive(id, dto, currentUser.id);
    return toDto(PaymentTermResponseDto, term);
  }

  @Delete('payment-terms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a term (only if no linked receipts)' })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.termService.delete(id);
  }

  // --------------------------------------------
  // Helpers
  // --------------------------------------------

  /**
   * Verify the project exists in the caller's organization (cross-tenant
   * safety). Returns the loaded project for downstream use.
   */
  private async assertProjectInOrg(
    projectId: string,
  ): Promise<{ id: string; quoteId: string }> {
    try {
      const project = await this.projectRepository.findById(projectId);
      return { id: project.id, quoteId: project.quoteId };
    } catch {
      throw new NotFoundException(`Project ${projectId} not found in this organization`);
    }
  }
}
