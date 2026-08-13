import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import type { CurrentUserType } from '../../auth/types';
import { BulkApproveDto, QueryApprovalsDto, RejectApprovalDto, SubmitApprovalDto } from '../dto';
import { PendingLedgerEntryEntity } from '../entities';
import {
  BulkApproveResult,
  ImpactLine,
  PaymentApprovalService,
} from '../services';

@ApiTags('Payment Approvals')
@Controller('payment-approvals')
export class PaymentApprovalController {
  constructor(private readonly service: PaymentApprovalService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit money for verification',
    description:
      'Records a claim. Nothing reaches the ledger and no balance moves until an approver — ' +
      'someone other than the submitter — approves it.',
  })
  async submit(
    @Body() dto: SubmitApprovalDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PendingLedgerEntryEntity> {
    return this.service.submit(dto, currentUser.id);
  }

  @Get()
  @ApiOperation({ summary: 'The approval queue, oldest pending first' })
  async list(@Query() query: QueryApprovalsDto): Promise<{
    data: PendingLedgerEntryEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.service.list(query);
  }

  // Declared before ':id' so the literal path is not captured by the param route.
  @Get('summary')
  @ApiOperation({ summary: 'Pending count, for the navigation badge' })
  async summary(): Promise<{ pendingCount: number }> {
    return this.service.summary();
  }

  @Post('bulk-approve')
  @ApiOperation({
    summary: 'Approve several at once',
    description:
      'Each id is processed independently and the response reports per-row outcomes, so a ' +
      'couple of failures do not discard the approvals that succeeded.',
  })
  async bulkApprove(
    @Body() dto: BulkApproveDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<BulkApproveResult> {
    return this.service.bulkApprove(dto.ids, currentUser.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'One request, including any possible duplicates' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PendingLedgerEntryEntity & { possibleDuplicates: PendingLedgerEntryEntity[] }> {
    return this.service.getOne(id);
  }

  @Get(':id/impact')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({
    summary: 'What approving this would settle',
    description:
      'Computed with the same waterfall the real write uses, but nothing is committed. A ' +
      'preview of this moment — the binding allocation is recalculated at approval.',
  })
  async impact(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ lines: ImpactLine[]; unallocatedPaise: number }> {
    return this.service.previewImpact(id);
  }

  @Post(':id/approve')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Approve — this is what moves the money' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PendingLedgerEntryEntity> {
    return this.service.approve(id, currentUser.id);
  }

  @Post(':id/reject')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({
    summary: 'Reject with a reason',
    description: 'Terminal. A corrected payment is submitted as a new record.',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApprovalDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PendingLedgerEntryEntity> {
    return this.service.reject(id, dto.reason, currentUser.id);
  }

  @Post(':id/cancel')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Withdraw your own submission' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PendingLedgerEntryEntity> {
    return this.service.cancel(id, currentUser.id);
  }
}
