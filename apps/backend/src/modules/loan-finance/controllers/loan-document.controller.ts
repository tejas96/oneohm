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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Role, Roles, RolesGuard } from '@oneohm-epc/shared-auth';
import { LoanDocumentType } from '@oneohm-epc/shared-types';

import {
  CreateLoanDocumentDto,
  UpdateLoanDocumentDto,
  LoanDocumentResponseDto,
} from '../dto';
import { LoanDocumentService } from '../services/loan-document.service';

/**
 * Controller for Loan Documents
 */
@ApiTags('Loan & Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loan-documents')
export class LoanDocumentController {
  constructor(private readonly loanDocumentService: LoanDocumentService) {}

  // ============================================
  // CREATE
  // ============================================

  @Post()
  @Roles(Role.ADMIN, Role.ACCOUNTS, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Upload a new loan document' })
  @ApiResponse({
    status: 201,
    description: 'Loan document uploaded successfully',
    type: LoanDocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createDto: CreateLoanDocumentDto,
    @CurrentUser() user: { id: string },
  ): Promise<LoanDocumentResponseDto> {
    return this.loanDocumentService.create({
      ...createDto,
      createdBy: user.id,
    });
  }

  // ============================================
  // READ
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all loan documents' })
  @ApiResponse({
    status: 200,
    description: 'List of all loan documents',
    type: [LoanDocumentResponseDto],
  })
  async findAll(): Promise<LoanDocumentResponseDto[]> {
    return this.loanDocumentService.findAll();
  }

  @Get('loan-application/:loanApplicationId')
  @ApiOperation({ summary: 'Get all documents for a loan application' })
  @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of documents for the loan application',
    type: [LoanDocumentResponseDto],
  })
  async findByLoanApplication(
    @Param('loanApplicationId', ParseUUIDPipe) loanApplicationId: string,
  ): Promise<LoanDocumentResponseDto[]> {
    return this.loanDocumentService.findByLoanApplication(loanApplicationId);
  }

  @Get('loan-application/:loanApplicationId/type/:documentType')
  @ApiOperation({ summary: 'Get documents by type for a loan application' })
  @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
  @ApiParam({ name: 'documentType', enum: LoanDocumentType, description: 'Document type' })
  @ApiResponse({
    status: 200,
    description: 'List of documents of the specified type',
    type: [LoanDocumentResponseDto],
  })
  async findByDocumentType(
    @Param('loanApplicationId', ParseUUIDPipe) loanApplicationId: string,
    @Param('documentType') documentType: LoanDocumentType,
  ): Promise<LoanDocumentResponseDto[]> {
    return this.loanDocumentService.findByDocumentType(loanApplicationId, documentType);
  }

  @Get('loan-application/:loanApplicationId/verified')
  @ApiOperation({ summary: 'Get verified documents for a loan application' })
  @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of verified documents',
    type: [LoanDocumentResponseDto],
  })
  async findVerified(
    @Param('loanApplicationId', ParseUUIDPipe) loanApplicationId: string,
  ): Promise<LoanDocumentResponseDto[]> {
    return this.loanDocumentService.findVerified(loanApplicationId);
  }

  @Get('loan-application/:loanApplicationId/unverified')
  @ApiOperation({ summary: 'Get unverified documents for a loan application' })
  @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of unverified documents',
    type: [LoanDocumentResponseDto],
  })
  async findUnverified(
    @Param('loanApplicationId', ParseUUIDPipe) loanApplicationId: string,
  ): Promise<LoanDocumentResponseDto[]> {
    return this.loanDocumentService.findUnverified(loanApplicationId);
  }

  @Get('unverified/all')
  @ApiOperation({ summary: 'Get all unverified documents across all applications' })
  @ApiResponse({
    status: 200,
    description: 'List of all unverified documents',
    type: [LoanDocumentResponseDto],
  })
  async findAllUnverified(): Promise<LoanDocumentResponseDto[]> {
    return this.loanDocumentService.findAllUnverified();
  }

  @Get('loan-application/:loanApplicationId/stats')
  @ApiOperation({ summary: 'Get verification statistics for a loan application' })
  @ApiParam({ name: 'loanApplicationId', description: 'Loan Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Document verification statistics',
  })
  async getVerificationStats(
    @Param('loanApplicationId', ParseUUIDPipe) loanApplicationId: string,
  ): Promise<{
    total: number;
    verified: number;
    unverified: number;
    verificationPercentage: number;
  }> {
    return this.loanDocumentService.getVerificationStats(loanApplicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan document by ID' })
  @ApiParam({ name: 'id', description: 'Loan Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan document found',
    type: LoanDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan document not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<LoanDocumentResponseDto> {
    return this.loanDocumentService.findById(id);
  }

  // ============================================
  // UPDATE
  // ============================================

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ACCOUNTS, Role.MANAGER)
  @ApiOperation({ summary: 'Update a loan document' })
  @ApiParam({ name: 'id', description: 'Loan Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan document updated successfully',
    type: LoanDocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Loan document not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLoanDocumentDto,
  ): Promise<LoanDocumentResponseDto> {
    return this.loanDocumentService.update(id, updateDto);
  }

  @Patch(':id/verify')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Verify a loan document' })
  @ApiParam({ name: 'id', description: 'Loan Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan document verified successfully',
    type: LoanDocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Document already verified' })
  @ApiResponse({ status: 404, description: 'Loan document not found' })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<LoanDocumentResponseDto> {
    return this.loanDocumentService.verify(id, user.id);
  }

  @Patch(':id/unverify')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Unverify a loan document' })
  @ApiParam({ name: 'id', description: 'Loan Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Loan document unverified successfully',
    type: LoanDocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Document not verified' })
  @ApiResponse({ status: 404, description: 'Loan document not found' })
  async unverify(@Param('id', ParseUUIDPipe) id: string): Promise<LoanDocumentResponseDto> {
    return this.loanDocumentService.unverify(id);
  }

  // ============================================
  // DELETE
  // ============================================

  @Delete(':id')
  @Roles(Role.ADMIN, Role.ACCOUNTS)
  @ApiOperation({ summary: 'Delete a loan document' })
  @ApiParam({ name: 'id', description: 'Loan Document UUID' })
  @ApiResponse({ status: 200, description: 'Loan document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Loan document not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.loanDocumentService.delete(id);
    return { message: 'Loan document deleted successfully' };
  }
}

