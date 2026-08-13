import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { PendingLedgerEntryEntity } from '../../payment-approvals/entities';
import { PaymentApprovalService } from '../../payment-approvals/services';
import {
  ChangeOrderDto,
  LedgerEntryResponseDto,
  MilestoneBalanceResponseDto,
  ProjectLedgerSummaryDto,
  RecordExpenseDto,
  ProofDocumentDto,
  RecordReceiptDto,
  ReverseEntryDto,
  WaiveMilestoneDto,
} from '../dto';
import { LedgerRepository } from '../repositories/ledger.repository';
import { LedgerWriteService } from '../services/ledger-write.service';
import { MilestoneService } from '../services/milestone.service';
import { ReceiptDocumentService } from '../services/receipt-document.service';

/**
 * Accept both the single `proofDocument` and the newer `proofDocuments` array
 * so older callers keep working while the UI uploads several images.
 */
function mergeProofs(dto: {
  proofDocument?: ProofDocumentDto;
  proofDocuments?: ProofDocumentDto[];
}): ProofDocumentDto[] | undefined {
  const all = [...(dto.proofDocuments ?? []), ...(dto.proofDocument ? [dto.proofDocument] : [])];
  return all.length > 0 ? all : undefined;
}

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
    // forwardRef because PaymentApprovalModule imports LedgerModule for
    // LedgerWriteService, and this controller now needs the approval service
    // back — a genuine cycle between the two modules.
    @Inject(forwardRef(() => PaymentApprovalService))
    private readonly approvals: PaymentApprovalService,
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
    const rows = await this.ledgerRepository.getMilestoneBalancesWithAllocations(projectId);
    return toDtoArray(MilestoneBalanceResponseDto, rows);
  }

  // ============================================
  // MONEY IN / OUT
  // ============================================

  @Post('projects/:projectId/ledger/receipts')
  @ApiOperation({
    summary: 'Submit money received for approval',
    description:
      'Since the approval queue landed this no longer writes to the ledger. It queues the ' +
      'receipt for verification and returns the pending request; the customer’s outstanding ' +
      'moves only when an approver — someone other than the submitter — approves it. ' +
      '`allocations` is carried through and applied at approval; omit it and the waterfall ' +
      'fills milestones in order. Either way the split is validated against live balances at ' +
      'approval, since the schedule can be repriced while a payment waits in the queue.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async recordReceipt(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: RecordReceiptDto,
  ): Promise<PendingLedgerEntryEntity> {
    // Deliberately a behaviour change rather than a second endpoint: a route
    // that still wrote straight to the ledger would be an unguarded hole
    // through the control this queue exists to provide.
    return this.approvals.submit(
      {
        kind: 'receipt',
        projectId,
        amountPaise: dto.amountPaise,
        valueDate: dto.valueDate,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        customerId: dto.customerId,
        allocations: dto.allocations,
        proofDocuments: mergeProofs(dto),
      },
      currentUser.id,
    );
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
  ): Promise<PendingLedgerEntryEntity> {
    return this.approvals.submit(
      {
        kind: 'expense',
        projectId,
        amountPaise: dto.amountPaise,
        valueDate: dto.valueDate,
        category: dto.category,
        counterparty: dto.payee,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        proofDocuments: mergeProofs(dto),
      },
      currentUser.id,
    );
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
  ): Promise<PendingLedgerEntryEntity> {
    // Reversals queue too. Without this, anyone could undo an approved receipt
    // single-handedly and walk straight around the control.
    return this.approvals.submit(
      { kind: 'reversal', reversesEntryId: entryId, reversalReason: dto.reason },
      currentUser.id,
    );
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
    const milestone = await this.milestoneService.addChangeOrder(projectId, dto, currentUser.id);
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
    const milestone = await this.milestoneService.waive(milestoneId, dto.reason, currentUser.id);
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
