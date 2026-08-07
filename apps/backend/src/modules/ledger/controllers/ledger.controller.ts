import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  ChangeOrderDto,
  LedgerEntryResponseDto,
  MilestoneBalanceResponseDto,
  ProjectLedgerSummaryDto,
  RecordExpenseDto,
  RecordReceiptDto,
  ReverseEntryDto,
  WaiveMilestoneDto,
} from '../dto';
import { LedgerRepository } from '../repositories/ledger.repository';
import { LedgerWriteService } from '../services/ledger-write.service';
import { MilestoneService } from '../services/milestone.service';
import { ReceiptDocumentService } from '../services/receipt-document.service';

/**
 * The ledger surface.
 *
 * ⚠️ Guarded by `JwtAuthGuard` only — deliberately no permission checks. RBAC is
 * being rebuilt as a separate piece of work covering the whole application, so
 * adding finance-specific permission codes now would only be thrown away.
 *
 * `reverse` is kept as its own endpoint rather than folded into a generic
 * update, precisely so that when RBAC lands it can be restricted with a single
 * decorator without touching the recording path. That is the one operation where
 * "who may do this" genuinely differs from "who may record a payment".
 */
@Controller()
@ApiTags('Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly writeService: LedgerWriteService,
    private readonly receiptDocumentService: ReceiptDocumentService,
    private readonly milestoneService: MilestoneService,
    private readonly ledgerRepository: LedgerRepository,
  ) {}

  // ============================================
  // READS
  // ============================================

  @Get('projects/:projectId/ledger/summary')
  @ApiOperation({
    summary: 'Contract, received, outstanding and unallocated credit for a project',
    description:
      'Every figure is derived from the ledger — nothing is read from a cached balance column.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async getSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectLedgerSummaryDto> {
    const [balance, milestones] = await Promise.all([
      this.ledgerRepository.getProjectBalance(projectId),
      this.ledgerRepository.getMilestoneBalancesWithAllocations(projectId),
    ]);

    // Without this, an unknown / soft-deleted / cross-org project returned 200
    // with every money field undefined — and ProjectLedgerService already threw
    // 404 for the identical case over the same repository call.
    if (!balance) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return toDto(ProjectLedgerSummaryDto, {
      ...balance,
      milestones: toDtoArray(MilestoneBalanceResponseDto, milestones),
    });
  }

  @Get('projects/:projectId/ledger/entries')
  @ApiOperation({ summary: 'Every ledger entry for a project, newest first' })
  @ApiParam({ name: 'projectId', type: String })
  async listEntries(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<LedgerEntryResponseDto[]> {
    const entries = await this.ledgerRepository.listEntriesByProject(projectId);
    return toDtoArray(LedgerEntryResponseDto, entries);
  }

  /**
   * Namespaced under `ledger/` on purpose. `GET projects/:id/milestones` is
   * already taken by `project-analytics.controller.ts:34`, which serves
   * PROJECT-TASK milestones (`project_tasks.milestone_name`) — an entirely
   * different concept from payment milestones. Registering the same path here
   * would have been silently shadowed, since ProjectsModule loads first.
   */
  @Get('projects/:projectId/ledger/milestones')
  @ApiOperation({ summary: 'Payment milestone plan with derived balances' })
  @ApiParam({ name: 'projectId', type: String })
  async listMilestones(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MilestoneBalanceResponseDto[]> {
    const rows = await this.ledgerRepository.getMilestoneBalancesWithAllocations(
      projectId,
    );
    return toDtoArray(MilestoneBalanceResponseDto, rows);
  }

  // ============================================
  // MONEY IN / OUT
  // ============================================

  @Post('projects/:projectId/ledger/receipts')
  @ApiOperation({
    summary: 'Record money received',
    description:
      'Omit `allocations` and the receipt fills milestones in order, spilling into the next — ' +
      'anything left over becomes project credit rather than being forced onto the last milestone.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async recordReceipt(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: RecordReceiptDto,
  ): Promise<LedgerEntryResponseDto> {
    const entry = await this.writeService.recordReceipt(
      { projectId, ...dto },
      currentUser.id,
    );
    return toDto(LedgerEntryResponseDto, entry);
  }

  @Post('projects/:projectId/ledger/expenses')
  @ApiOperation({
    summary: 'Record money spent',
    description:
      'Expenses never change what the customer owes. If the customer agreed to pay for extra ' +
      'scope, raise a change order instead.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async recordExpense(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: RecordExpenseDto,
  ): Promise<LedgerEntryResponseDto> {
    const entry = await this.writeService.recordExpense(
      { projectId, ...dto },
      currentUser.id,
    );
    return toDto(LedgerEntryResponseDto, entry);
  }

  @Post('ledger/entries/:entryId/receipt-document')
  @ApiOperation({
    summary: 'File a generated payment receipt against the customer’s property',
    description:
      'Takes the rendered receipt PDF, stores it, and registers it in the property documents. ' +
      'The PDF is produced in the browser because it must print the entry number, which is minted ' +
      'inside the write transaction — so this runs after the payment has already committed and ' +
      'must never be treated as part of it. Safe to call again: the receipt is derived from data, ' +
      'so regenerating simply files a fresh copy.',
  })
  @ApiParam({ name: 'entryId', type: String })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async storeReceiptDocument(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @UploadedFile() file: { buffer: Buffer; originalname?: string; mimetype?: string } | undefined,
  ): Promise<{ documentId: string; fileUrl: string }> {
    if (!file) {
      throw new BadRequestException('No receipt file was uploaded');
    }
    const document = await this.receiptDocumentService.storeGeneratedReceipt(
      entryId,
      file,
      currentUser.id,
    );
    return { documentId: document.id, fileUrl: document.fileUrl };
  }

  @Post('ledger/entries/:entryId/reverse')
  @ApiOperation({
    summary: 'Reverse an entry — a bounced cheque, or a wrong amount',
    description:
      'Posts a new opposing entry rather than editing anything. Both the original and the ' +
      'correction stay visible forever, which is what makes the ledger auditable.',
  })
  @ApiParam({ name: 'entryId', type: String })
  async reverse(
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: ReverseEntryDto,
  ): Promise<LedgerEntryResponseDto> {
    const entry = await this.writeService.reverse(
      entryId,
      dto.reason,
      currentUser.id,
    );
    return toDto(LedgerEntryResponseDto, entry);
  }

  // ============================================
  // THE PLAN
  // ============================================

  @Post('projects/:projectId/change-orders')
  @ApiOperation({
    summary: 'Add agreed extra scope, raising the contract total',
    description:
      'Free text and any amount. Creates a milestone, never a ledger entry — a change order is ' +
      'not cash, and the contract total rises because it is the sum of the milestones.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async addChangeOrder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: ChangeOrderDto,
  ): Promise<MilestoneBalanceResponseDto> {
    const milestone = await this.milestoneService.addChangeOrder(
      projectId,
      dto,
      currentUser.id,
    );
    const rows = await this.ledgerRepository.getMilestoneBalances(projectId);
    const created = rows.find((r) => r.milestoneId === milestone.id);
    return toDto(MilestoneBalanceResponseDto, created ?? {});
  }

  @Patch('ledger/milestones/:milestoneId/waive')
  @ApiOperation({
    summary: 'Waive a milestone',
    description:
      'Removes it from what is expected while keeping the row and the reason. Waived milestones ' +
      'absorb nothing when a receipt is allocated.',
  })
  @ApiParam({ name: 'milestoneId', type: String })
  async waive(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: WaiveMilestoneDto,
  ): Promise<{ id: string; status: string }> {
    const milestone = await this.milestoneService.waive(
      milestoneId,
      dto.reason,
      currentUser.id,
    );
    return { id: milestone.id, status: milestone.status };
  }

  @Delete('ledger/milestones/:milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a milestone',
    description:
      'Refused if any payment is allocated to it — waive it instead. Enforced by a foreign key, ' +
      'not by application logic.',
  })
  @ApiParam({ name: 'milestoneId', type: String })
  async remove(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.milestoneService.remove(milestoneId, currentUser.id);
  }
}
