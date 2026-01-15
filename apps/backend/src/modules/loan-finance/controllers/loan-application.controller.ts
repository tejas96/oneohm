import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateLoanApplicationDto,
  UpdateLoanApplicationDto,
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
  ): Promise<LoanApplicationResponseDto | null> {
    return this.loanApplicationService.findByProperty(propertyId);
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
    });
  }

  // ============================================
  // DELETE
  // ============================================

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a loan application (soft delete)' })
  @ApiParam({ name: 'id', description: 'Loan Application UUID' })
  @ApiResponse({ status: 200, description: 'Loan application deleted successfully' })
  @ApiResponse({ status: 404, description: 'Loan application not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.loanApplicationService.delete(id);
    return { message: 'Loan application deleted successfully' };
  }
}
