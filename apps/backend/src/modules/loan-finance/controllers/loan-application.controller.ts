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
  ParseIntPipe,
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
import type { PaginatedResponse } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateLoanApplicationDto,
  UpdateLoanApplicationDto,
  UpdateLoanStatusDto,
  LoanApplicationResponseDto,
} from '../dto';
import { LoanApplicationService } from '../services/loan-application.service';

/**
 * Controller for Loan Applications
 * Simplified for tracking customer loan interest with external banks.
 * We don't provide loans - customers get them from banks.
 */
@ApiTags('Loan & Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loan-applications')
export class LoanApplicationController {
  constructor(private readonly loanApplicationService: LoanApplicationService) {}

  // ============================================
  // CREATE
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a new loan application (track loan interest)' })
  @ApiResponse({
    status: 201,
    description: 'Loan application created successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createDto: CreateLoanApplicationDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.create(organizationId, {
      ...createDto,
      createdBy: user.id,
    });
  }

  // ============================================
  // READ
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all loan applications (paginated)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of loan applications',
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<LoanApplicationResponseDto>> {
    const result = await this.loanApplicationService.findAll(organizationId, page, limit);
    return toPaginatedResponse(LoanApplicationResponseDto, result.data, result.total, page, limit);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Get loan application by property' })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan application found for property',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({
    status: 204,
    description: 'No loan application found for this property',
  })
  async findByProperty(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @OrganizationContext() organizationId: string,
  ): Promise<LoanApplicationResponseDto | null> {
    return this.loanApplicationService.findByProperty(organizationId, propertyId);
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
    @OrganizationContext() organizationId: string,
  ): Promise<LoanApplicationResponseDto[]> {
    return this.loanApplicationService.findByCustomer(organizationId, customerId);
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
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.findById(organizationId, id);
  }

  // ============================================
  // UPDATE
  // ============================================

  @Patch(':id')
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.update(organizationId, id, {
      ...updateDto,
      updatedBy: user.id,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update loan application status (validated FSM transition)' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan application status updated successfully',
    type: LoanApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateLoanStatusDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LoanApplicationResponseDto> {
    return this.loanApplicationService.updateStatus(organizationId, id, statusDto.status, user.id);
  }

  // ============================================
  // DELETE
  // ============================================

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a loan application (soft delete)' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiResponse({ status: 200, description: 'Loan application deleted successfully' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
  ): Promise<{ message: string }> {
    await this.loanApplicationService.delete(organizationId, id);
    return { message: 'Loan application deleted successfully' };
  }
}
