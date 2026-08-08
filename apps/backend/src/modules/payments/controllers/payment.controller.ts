// ============================================
// IMPORTS
// ============================================
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PaymentTransactionStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  ReconcilePaymentDto,
  PaymentResponseDto,
} from '../dto';
import { PaymentService } from '../services/payment.service';

/**
 * PaymentController
 *
 * @deprecated Permanent alias for `/receipts/*`. New integrations should
 * use ReceiptController, which performs transactional create with
 * payment-term FOR UPDATE locks, FSM-validated status transitions, and
 * proof-document attachment in a single DB transaction. This controller
 * remains available indefinitely so existing integrations do not break.
 */
@Controller('payments')
@ApiTags('Payments (deprecated — use /receipts)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ============================================
  // CREATE
  // ============================================
  @Post()
  @ApiCreate({
    summary: 'Create a new payment',
    responseType: PaymentResponseDto,
  })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.create(dto, currentUser.id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // READ
  // ============================================
  @Get()
  @ApiReadAll({
    summary: 'Get all payments',
    responseType: PaymentResponseDto,
  })
  async findAll(): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findAll();
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get payment by ID',
    responseType: PaymentResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.findById(id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Get('organization')
  @ApiOperation({ summary: 'Get payments by organization' })
  async findByOrganization(): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByOrganization();
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get payments by project' })
  @ApiParam({ name: 'projectId', type: String })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByProject(projectId);
    return toDtoArray(PaymentResponseDto, payments);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get payments by customer' })
  @ApiParam({ name: 'customerId', type: String })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByCustomer(customerId);
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get payments by status' })
  @ApiParam({ name: 'status', enum: PaymentTransactionStatus })
  async findByStatus(
    @Param('status') status: PaymentTransactionStatus,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByStatus(status);
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('number/:paymentNumber')
  @ApiOperation({ summary: 'Get payment by payment number' })
  @ApiParam({ name: 'paymentNumber', type: String })
  async findByPaymentNumber(
    @Param('paymentNumber') paymentNumber: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.findByPaymentNumber(paymentNumber);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update payment',
    responseType: PaymentResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.update(id, dto, currentUser.id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/status/:status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'status', enum: PaymentTransactionStatus })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('status') status: PaymentTransactionStatus,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.updateStatus(id, status, currentUser.id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // RECONCILIATION
  // ============================================
  @Post(':id/reconcile')
  @ApiOperation({ summary: 'Reconcile payment' })
  @ApiParam({ name: 'id', type: String })
  async reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcilePaymentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.reconcile(id, dto, currentUser.id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete payment',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.paymentService.delete(id);
  }

  // ============================================
  // STATISTICS
  // ============================================
  @Get('project/:projectId/summary')
  @ApiOperation({ summary: 'Get payment summary for project' })
  @ApiParam({ name: 'projectId', type: String })
  async getProjectPaymentSummary(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<{
    totalExpected: number;
    totalPaid: number;
    pendingAmount: number;
    paymentCount: number;
  }> {
    return this.paymentService.getProjectPaymentSummary(projectId);
  }

  @Get('organization/stats')
  @ApiOperation({ summary: 'Get payment statistics by organization' })
  async getOrganizationPaymentStats(): Promise<
    Array<{
      status: PaymentTransactionStatus;
      count: number;
      totalAmount: number;
    }>
  > {
    return this.paymentService.getOrganizationPaymentStats();
  }

  // ============================================
  // UTILITIES
  // ============================================
  @Get('organization/next-number')
  @ApiOperation({ summary: 'Generate next payment number' })
  async generatePaymentNumber(): Promise<{ paymentNumber: string }> {
    const paymentNumber = await this.paymentService.generatePaymentNumber();
    return { paymentNumber };
  }
}
