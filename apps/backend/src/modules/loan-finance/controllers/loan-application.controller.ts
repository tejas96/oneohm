import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Role, Roles, RolesGuard } from '@oneohm-epc/shared-auth';
import { LoanStatus } from '@oneohm-epc/shared-types';

import {
  CreateLoanApplicationDto,
  UpdateLoanApplicationDto,
  LoanApplicationResponseDto,
} from '../dto';
import { LoanApplicationService } from '../services/loan-application.service';

/**
 * Controller for Loan Applications
 */
@ApiTags('Loan & Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loan-applications')
export class LoanApplicationController {
  constructor(private readonly loanApplicationService: LoanApplicationService) {}

  // ============================================
  // CREATE
  // ============================================

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new loan application' })
  @ApiResponse({
    status: 201,
    description: 'Loan application created successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createDto: CreateLoanApplicationDto,
    @CurrentUser() user: { id: string },
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.create({
      ...createDto,
      createdBy: user.id,
    });
  }

  // ============================================
  // READ
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all loan applications' })
  @ApiResponse({
    status: 200,
    description: 'List of all loan applications',
    type: [LoanApplicationResponseDto],
  })
  async findAll(): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findAll();
  }

  @Get('statistics/:organizationId')
  @ApiOperation({ summary: 'Get loan statistics by organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan application statistics',
  })
  async getStatistics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<Record<string, unknown>> {
    return this.loanApplicationService.getStatsByOrganization(organizationId);
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get loan applications by organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of loan applications for organization',
    type: [LoanApplicationResponseDto],
  })
  async findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findByOrganization(organizationId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get loan applications by project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of loan applications for project',
    type: [LoanApplicationResponseDto],
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findByProject(projectId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get loan applications by customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of loan applications for customer',
    type: [LoanApplicationResponseDto],
  })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findByCustomer(customerId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get loan applications by status' })
  @ApiParam({ name: 'status', enum: LoanStatus, description: 'Loan status' })
  @ApiResponse({
    status: 200,
    description: 'List of loan applications with given status',
    type: [LoanApplicationResponseDto],
  })
  async findByStatus(@Param('status') status: LoanStatus): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findByStatus(status);
  }

  @Get('application-number/:applicationNumber')
  @ApiOperation({ summary: 'Get loan application by application number' })
  @ApiParam({ name: 'applicationNumber', description: 'Application number (e.g., LA-2024-001)' })
  @ApiResponse({
    status: 200,
    description: 'Loan application found',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async findByApplicationNumber(
    @Param('applicationNumber') applicationNumber: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.findByApplicationNumber(applicationNumber);
  }

  @Get('jan-samarth/submitted')
  @ApiOperation({ summary: 'Get all applications submitted to Jan Samarth portal' })
  @ApiResponse({
    status: 200,
    description: 'List of applications submitted to Jan Samarth',
    type: [LoanApplicationResponseDto],
  })
  async findSubmittedToJanSamarth(): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findSubmittedToJanSamarth();
  }

  @Get('jan-samarth/pending')
  @ApiOperation({ summary: 'Get applications pending Jan Samarth submission' })
  @ApiResponse({
    status: 200,
    description: 'List of applications pending Jan Samarth submission',
    type: [LoanApplicationResponseDto],
  })
  async findPendingJanSamarthSubmission(): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findPendingJanSamarthSubmission();
  }

  @Get('site-visits/pending')
  @ApiOperation({ summary: 'Get applications with pending site visits' })
  @ApiResponse({
    status: 200,
    description: 'List of applications with pending site visits',
    type: [LoanApplicationResponseDto],
  })
  async findPendingSiteVisits(): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findPendingSiteVisits();
  }

  @Get('site-visits/completed')
  @ApiOperation({ summary: 'Get applications with completed site visits' })
  @ApiResponse({
    status: 200,
    description: 'List of applications with completed site visits',
    type: [LoanApplicationResponseDto],
  })
  async findCompletedSiteVisits(): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findCompletedSiteVisits();
  }

  @Get('disbursement-date-range')
  @ApiOperation({ summary: 'Get applications by disbursement date range' })
  @ApiQuery({ name: 'startDate', description: 'Start date (ISO 8601)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', description: 'End date (ISO 8601)', example: '2024-12-31' })
  @ApiResponse({
    status: 200,
    description: 'List of applications within disbursement date range',
    type: [LoanApplicationResponseDto],
  })
  async findByDisbursementDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findByDisbursementDateRange(new Date(startDate), new Date(endDate));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan application by ID' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan application found',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.findById(id);
  }

  // ============================================
  // UPDATE
  // ============================================

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a loan application' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan application updated successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLoanApplicationDto,
    @CurrentUser() user: { id: string },
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.update(id, {
      ...updateDto,
      updatedBy: user.id,
    } as UpdateLoanApplicationDto);
  }

  @Patch(':id/submit-jan-samarth')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Submit application to Jan Samarth portal' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiQuery({ name: 'janSamarthApplicationId', description: 'Jan Samarth application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application submitted to Jan Samarth successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async submitToJanSamarth(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('janSamarthApplicationId') janSamarthApplicationId: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.submitToJanSamarth(id, janSamarthApplicationId);
  }

  @Patch(':id/schedule-site-visit')
  @Roles(Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Schedule site visit for loan application' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiQuery({ name: 'scheduledDate', description: 'Scheduled date (ISO 8601)', example: '2024-01-15' })
  @ApiResponse({
    status: 200,
    description: 'Site visit scheduled successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async scheduleSiteVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('scheduledDate') scheduledDate: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.scheduleSiteVisit(id, new Date(scheduledDate));
  }

  @Patch(':id/complete-site-visit')
  @Roles(Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Complete site visit for loan application' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiQuery({ name: 'report', description: 'Site visit report' })
  @ApiResponse({
    status: 200,
    description: 'Site visit completed successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async completeSiteVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('report') report: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.completeSiteVisit(id, report);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Approve loan application' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiQuery({ name: 'approvedAmount', description: 'Approved loan amount', example: 100000 })
  @ApiQuery({ name: 'approvedByLender', description: 'Lender name who approved', example: 'Bank XYZ' })
  @ApiResponse({
    status: 200,
    description: 'Loan application approved successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('approvedAmount') approvedAmount: number,
    @Query('approvedByLender') approvedByLender: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.approve(id, Number(approvedAmount), approvedByLender);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Reject loan application' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiQuery({ name: 'rejectionReason', description: 'Reason for rejection' })
  @ApiResponse({
    status: 200,
    description: 'Loan application rejected successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('rejectionReason') rejectionReason: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.reject(id, rejectionReason);
  }

  @Patch(':id/disburse')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Disburse approved loan' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiQuery({ name: 'disbursementAmount', description: 'Disbursement amount', example: 100000 })
  @ApiQuery({ name: 'disbursementReference', description: 'Disbursement reference/transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Loan disbursed successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async disburse(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('disbursementAmount') disbursementAmount: number,
    @Query('disbursementReference') disbursementReference: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.disburse(id, Number(disbursementAmount), disbursementReference);
  }

  // ============================================
  // DELETE
  // ============================================

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Delete a loan application (soft delete)' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiResponse({ status: 200, description: 'Loan application deleted successfully' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.loanApplicationService.delete(id);
    return { message: 'Loan application deleted successfully' };
  }
}

