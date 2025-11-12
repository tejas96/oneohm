// ============================================
// IMPORTS
// ============================================
// Shared types
import { PaymentTransactionStatus } from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import {
  CurrentUser,
  type CurrentUserType,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';

// Third-party imports
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
import { plainToInstance } from 'class-transformer';

// Local imports
import { PaymentService } from '../services/payment.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  ReconcilePaymentDto,
  PaymentResponseDto,
} from '../dto';

/**
 * Controller for Payment operations
 */
@Controller('payments')
@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ============================================
  // CREATE
  // ============================================
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS)
  @ApiCreate({
    summary: 'Create a new payment',
    responseType: PaymentResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS],
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiReadAll({
    summary: 'Get all payments',
    responseType: PaymentResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER],
  })
  async findAll(): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findAll();
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiReadOne({
    summary: 'Get payment by ID',
    responseType: PaymentResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER],
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.findById(id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Get('organization/:organizationId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Get payments by organization' })
  @ApiParam({ name: 'organizationId', type: String })
  async findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByOrganization(organizationId);
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('project/:projectId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Get payments by project' })
  @ApiParam({ name: 'projectId', type: String })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByProject(projectId);
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('milestone/:milestoneId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Get payments by milestone' })
  @ApiParam({ name: 'milestoneId', type: String })
  async findByMilestone(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentService.findByMilestone(milestoneId);
    return plainToInstance(PaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get('customer/:customerId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS)
  @ApiUpdate({
    summary: 'Update payment',
    responseType: PaymentResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS],
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS)
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiDelete({
    summary: 'Delete payment',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.paymentService.delete(id);
  }

  // ============================================
  // STATISTICS
  // ============================================
  @Get('project/:projectId/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Get payment summary for project' })
  @ApiParam({ name: 'projectId', type: String })
  async getProjectPaymentSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{
    totalExpected: number;
    totalPaid: number;
    pendingAmount: number;
    paymentCount: number;
  }> {
    return this.paymentService.getProjectPaymentSummary(projectId);
  }

  @Get('organization/:organizationId/stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Get payment statistics by organization' })
  @ApiParam({ name: 'organizationId', type: String })
  async getOrganizationPaymentStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<
    Array<{
      status: PaymentTransactionStatus;
      count: number;
      totalAmount: number;
    }>
  > {
    return this.paymentService.getOrganizationPaymentStats(organizationId);
  }

  // ============================================
  // UTILITIES
  // ============================================
  @Get('organization/:organizationId/next-number')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Generate next payment number' })
  @ApiParam({ name: 'organizationId', type: String })
  async generatePaymentNumber(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<{ paymentNumber: string }> {
    const paymentNumber =
      await this.paymentService.generatePaymentNumber(organizationId);
    return { paymentNumber };
  }
}

