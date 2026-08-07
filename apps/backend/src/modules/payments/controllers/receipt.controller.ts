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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { toDto } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateReceiptDto, PaymentResponseDto, UpdateReceiptStatusDto } from '../dto';
import { ReceiptService } from '../services/receipt.service';

/**
 * ReceiptController
 *
 * The receipts surface (plan §3.2). Backed by the same `payments` table
 * via ReceiptService — `/payments/*` (PaymentController) remains a
 * permanent alias for legacy integrations.
 *
 * Endpoints:
 *   POST   /receipts                                   create
 *   PATCH  /receipts/:id/status                        FSM transition
 *   DELETE /receipts/:id                               soft delete + re-aggregate
 *   GET    /receipts/project/:projectId                flat list, newest first
 *   GET    /receipts/project/:projectId/summary        per-term breakdown + totals
 */
@Controller('receipts')
@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post()
  @ApiOperation({
    summary: 'Record a receipt against a project (optionally fulfilling a payment term)',
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: CreateReceiptDto,
  ): Promise<PaymentResponseDto> {
    const receipt = await this.receiptService.create(dto, currentUser.id);
    return toDto(PaymentResponseDto, receipt);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition a receipt status (FSM-validated)' })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: UpdateReceiptStatusDto,
  ): Promise<PaymentResponseDto> {
    const receipt = await this.receiptService.updateStatus(id, dto, currentUser.id);
    return toDto(PaymentResponseDto, receipt);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a receipt (re-aggregates the parent term in same transaction)',
  })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.receiptService.delete(id);
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Flat receipt list for a project, newest first',
    description:
      'Organization-scoped replacement for the legacy GET /payments/project/:projectId. ' +
      'Same PaymentResponseDto shape, so callers need no changes beyond the path.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async listByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<PaymentResponseDto[]> {
    const receipts = await this.receiptService.listByProject(projectId);
    return receipts.map((r) => toDto(PaymentResponseDto, r));
  }

  @Get('project/:projectId/summary')
  @ApiOperation({
    summary: 'Project receipt summary: totals, per-term breakdown, next-due, overdue count',
  })
  @ApiParam({ name: 'projectId', type: String })
  async getProjectSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ReturnType<ReceiptService['getProjectSummary']>> {
    return this.receiptService.getProjectSummary(projectId);
  }
}
