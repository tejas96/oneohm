// ============================================
// IMPORTS
// ============================================
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentStatus, DocumentType } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';


import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateDocumentDto,
  CreateDocumentVersionDto,
  DocumentResponseDto,
  DocumentVersionResponseDto,
  SignDocumentDto,
  UpdateDocumentDto,
  UpdateDocumentStatusDto,
  VerifyDocumentOtpDto,
} from '../dto';
import { DocumentService } from '../services/document.service';

/**
 * Document Controller
 * REST API endpoints for document management
 */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // ============================================
  // CREATE
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
    type: DocumentResponseDto,
  })
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.create(dto, currentUser.id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  @Post('versions')
  @ApiOperation({ summary: 'Create a new document version' })
  @ApiResponse({
    status: 201,
    description: 'Document version created successfully',
    type: DocumentResponseDto,
  })
  async createVersion(
    @Body() dto: CreateDocumentVersionDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.createVersion(dto, currentUser.id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  // ============================================
  // READ
  // ============================================
  @Get()
  @ApiOperation({ summary: 'Get all documents (filtered)' })
  @ApiQuery({ name: 'organizationId', type: String, required: false })
  @ApiQuery({ name: 'projectId', type: String, required: false })
  @ApiQuery({ name: 'customerId', type: String, required: false })
  @ApiQuery({ name: 'quoteId', type: String, required: false })
  @ApiQuery({ name: 'paymentId', type: String, required: false })
  @ApiQuery({ name: 'documentType', enum: DocumentType, required: false })
  @ApiQuery({ name: 'status', enum: DocumentStatus, required: false })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: [DocumentResponseDto],
  })
  async findAll(
    @OrganizationContext() orgId: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
    @Query('customerId') customerId?: string,
    @Query('quoteId') quoteId?: string,
    @Query('paymentId') paymentId?: string,
    @Query('documentType') documentType?: DocumentType,
    @Query('status') status?: DocumentStatus,
  ): Promise<DocumentResponseDto[]> {
    let documents;

    if (organizationId) {
      documents = await this.documentService.findByOrganization(organizationId);
    } else if (projectId) {
      documents = await this.documentService.findByProject(projectId, orgId);
    } else if (customerId) {
      documents = await this.documentService.findByCustomer(customerId);
    } else if (quoteId) {
      documents = await this.documentService.findByQuote(quoteId);
    } else if (paymentId) {
      documents = await this.documentService.findByPayment(paymentId);
    } else if (documentType) {
      documents = await this.documentService.findByType(documentType);
    } else if (status) {
      documents = await this.documentService.findByStatus(status);
    } else {
      documents = await this.documentService.findAll();
    }

    return plainToInstance(DocumentResponseDto, documents, { excludeExtraneousValues: true });
  }

  @Get('number/:documentNumber')
  @ApiOperation({ summary: 'Get document by document number' })
  @ApiParam({ name: 'documentNumber', type: String })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findByDocumentNumber(
    @Param('documentNumber') documentNumber: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.findByDocumentNumber(documentNumber);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  @Get('wcr/:wcrSessionNumber')
  @ApiOperation({ summary: 'Get documents by WCR session number' })
  @ApiParam({ name: 'wcrSessionNumber', type: String })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: [DocumentResponseDto],
  })
  async findByWcrSession(
    @Param('wcrSessionNumber') wcrSessionNumber: string,
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.documentService.findByWcrSession(wcrSessionNumber);
    return plainToInstance(DocumentResponseDto, documents, { excludeExtraneousValues: true });
  }

  @Get('stats/:organizationId')
  @ApiOperation({ summary: 'Get document statistics for organization' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Param('organizationId') organizationId: string): Promise<{
    byType: { type: DocumentType; count: number }[];
    byStatus: { status: DocumentStatus; count: number }[];
    unsigned: number;
    unverified: number;
  }> {
    return this.documentService.getDocumentStats(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findById(@Param('id') id: string): Promise<DocumentResponseDto> {
    const document = await this.documentService.findById(id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of a document' })
  @ApiResponse({
    status: 200,
    description: 'Document versions retrieved successfully',
    type: [DocumentVersionResponseDto],
  })
  async findVersions(@Param('id') id: string): Promise<DocumentVersionResponseDto[]> {
    const versions = await this.documentService.findVersions(id);
    return plainToInstance(DocumentVersionResponseDto, versions, { excludeExtraneousValues: true });
  }

  @Get(':id/latest-version')
  @ApiOperation({ summary: 'Get latest version of a document' })
  @ApiResponse({
    status: 200,
    description: 'Latest version retrieved successfully',
    type: DocumentResponseDto,
  })
  async findLatestVersion(@Param('id') id: string): Promise<DocumentResponseDto | null> {
    const document = await this.documentService.findLatestVersion(id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  // ============================================
  // UPDATE
  // ============================================
  @Patch(':id')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.update(id, dto, currentUser.id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update document status' })
  @ApiResponse({
    status: 200,
    description: 'Document status updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.updateStatus(id, dto, currentUser.id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  // ============================================
  // DIGITAL SIGNATURE
  // ============================================
  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign document digitally' })
  @ApiResponse({
    status: 200,
    description: 'Document signed successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async signDocument(
    @Param('id') id: string,
    @Body() dto: SignDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.signDocument(id, dto, currentUser.id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  // ============================================
  // OTP VERIFICATION
  // ============================================
  @Post(':id/verify-otp')
  @ApiOperation({ summary: 'Verify document with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Document verified successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async verifyOtp(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentOtpDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.verifyOtp(id, dto, currentUser.id);
    return plainToInstance(DocumentResponseDto, document, { excludeExtraneousValues: true });
  }

  // ============================================
  // DELETE
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete document (soft delete)' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.documentService.delete(id);
  }
}
