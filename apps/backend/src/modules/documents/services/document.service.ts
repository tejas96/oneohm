// ============================================
// IMPORTS
// ============================================
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType } from '@oneohm-epc/shared-types';

import {
  CreateDocumentDto,
  CreateDocumentVersionDto,
  SignDocumentDto,
  UpdateDocumentDto,
  UpdateDocumentStatusDto,
  VerifyDocumentOtpDto,
} from '../dto';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentRepository } from '../repositories/document.repository';

/**
 * DocumentService
 * Business logic for document management with signatures and OTP
 */
@Injectable()
export class DocumentService {
  constructor(private readonly documentRepository: DocumentRepository) {}

  // ============================================
  // CREATE
  // ============================================
  async create(dto: CreateDocumentDto, userId: string): Promise<DocumentEntity> {
    // Generate document number
    const documentNumber = await this.generateDocumentNumber(dto.organizationId, dto.documentType);

    // Validate parent document if versioning
    if (dto.parentDocumentId) {
      const parentDoc = await this.documentRepository.findById(dto.parentDocumentId);
      if (!parentDoc) {
        throw new NotFoundException(`Parent document with ID ${dto.parentDocumentId} not found`);
      }

      // Mark all previous versions as not latest
      await this.documentRepository.markAllVersionsAsNotLatest(dto.parentDocumentId);

      // Get next version number
      const version = await this.documentRepository.getNextVersionNumber(dto.parentDocumentId);

      return this.documentRepository.create({
        ...dto,
        documentNumber,
        version,
        isLatestVersion: true,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    // Create new document
    return this.documentRepository.create({
      ...dto,
      documentNumber,
      version: 1,
      isLatestVersion: true,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  // ============================================
  // READ
  // ============================================
  async findById(id: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async findAll(): Promise<DocumentEntity[]> {
    return this.documentRepository.findAll();
  }

  async findByDocumentNumber(documentNumber: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findByDocumentNumber(documentNumber);
    if (!document) {
      throw new NotFoundException(`Document with number ${documentNumber} not found`);
    }
    return document;
  }

  async findByOrganization(organizationId: string): Promise<DocumentEntity[]> {
    return this.documentRepository.findByOrganization(organizationId);
  }

  async findByProject(projectId: string): Promise<DocumentEntity[]> {
    return this.documentRepository.findByProject(projectId);
  }

  async findByCustomer(customerId: string): Promise<DocumentEntity[]> {
    return this.documentRepository.findByCustomer(customerId);
  }

  async findByQuote(quoteId: string): Promise<DocumentEntity[]> {
    return this.documentRepository.findByQuote(quoteId);
  }

  async findByPayment(paymentId: string): Promise<DocumentEntity[]> {
    return this.documentRepository.findByPayment(paymentId);
  }

  async findByType(documentType: DocumentType): Promise<DocumentEntity[]> {
    return this.documentRepository.findByType(documentType);
  }

  async findByStatus(status: DocumentStatus): Promise<DocumentEntity[]> {
    return this.documentRepository.findByStatus(status);
  }

  async findByWcrSession(wcrSessionNumber: string): Promise<DocumentEntity[]> {
    return this.documentRepository.findByWcrSession(wcrSessionNumber);
  }

  // ============================================
  // VERSION CONTROL
  // ============================================
  async findVersions(documentId: string): Promise<DocumentEntity[]> {
    // Verify document exists
    await this.findById(documentId);
    return this.documentRepository.findVersions(documentId);
  }

  async findLatestVersion(documentId: string): Promise<DocumentEntity | null> {
    // Verify document exists
    await this.findById(documentId);
    return this.documentRepository.findLatestVersion(documentId);
  }

  async createVersion(dto: CreateDocumentVersionDto, userId: string): Promise<DocumentEntity> {
    const parentDoc = await this.findById(dto.parentDocumentId);

    // Mark all previous versions as not latest
    await this.documentRepository.markAllVersionsAsNotLatest(dto.parentDocumentId);

    // Get next version number
    const version = await this.documentRepository.getNextVersionNumber(dto.parentDocumentId);

    // Create new version
    return this.documentRepository.create({
      organizationId: parentDoc.organizationId,
      documentType: parentDoc.documentType,
      projectId: parentDoc.projectId,
      customerId: parentDoc.customerId,
      quoteId: parentDoc.quoteId,
      paymentId: parentDoc.paymentId,
      ...dto,
      documentNumber: parentDoc.documentNumber, // Same doc number for versions
      version,
      isLatestVersion: true,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, dto: UpdateDocumentDto, userId: string): Promise<DocumentEntity> {
    // Verify document exists
    await this.findById(id);

    const updated = await this.documentRepository.update(id, {
      ...dto,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateDocumentStatusDto,
    userId: string,
  ): Promise<DocumentEntity> {
    const document = await this.findById(id);

    // Validate status transition
    this.validateStatusTransition(document.status, dto.status);

    const updated = await this.documentRepository.update(id, {
      status: dto.status,
      notes: dto.notes ? `${document.notes ?? ''}\n${dto.notes}` : document.notes,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return updated;
  }

  // ============================================
  // DIGITAL SIGNATURE
  // ============================================
  async signDocument(id: string, dto: SignDocumentDto, userId: string): Promise<DocumentEntity> {
    const document = await this.findById(id);

    // Check if already signed
    if (document.isSigned) {
      throw new BadRequestException('Document is already signed');
    }

    // Validate document status (should be approved)
    if (document.status !== DocumentStatus.APPROVED) {
      throw new BadRequestException('Only approved documents can be signed');
    }

    // If OTP is required and provided, verify it
    if (dto.otp) {
      await this.verifyOtp(id, { otp: dto.otp }, userId);
    }

    const updated = await this.documentRepository.update(id, {
      isSigned: true,
      signedBy: userId,
      signedAt: new Date(),
      signatureData: dto.signatureData,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return updated;
  }

  // ============================================
  // OTP VERIFICATION
  // ============================================
  async verifyOtp(id: string, dto: VerifyDocumentOtpDto, userId: string): Promise<DocumentEntity> {
    const document = await this.findById(id);

    // Check if already verified
    if (document.isOtpVerified) {
      throw new BadRequestException('Document is already OTP verified');
    }

    // TODO: Implement actual OTP verification logic
    // For now, we'll just accept any OTP (placeholder)
    if (!dto.otp || dto.otp.length < 4) {
      throw new BadRequestException('Invalid OTP');
    }

    const updated = await this.documentRepository.update(id, {
      isOtpVerified: true,
      otpVerifiedAt: new Date(),
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return updated;
  }

  // ============================================
  // DELETE
  // ============================================
  async delete(id: string): Promise<void> {
    // Verify document exists
    await this.findById(id);
    await this.documentRepository.softDelete(id);
  }

  // ============================================
  // STATISTICS
  // ============================================
  async getDocumentStats(organizationId: string): Promise<{
    byType: { type: DocumentType; count: number }[];
    byStatus: { status: DocumentStatus; count: number }[];
    unsigned: number;
    unverified: number;
  }> {
    const byType = await this.documentRepository.countByType(organizationId);
    const byStatus = await this.documentRepository.countByStatus(organizationId);
    const unsignedDocs = await this.documentRepository.findUnsignedDocuments(organizationId);
    const unverifiedDocs = await this.documentRepository.findUnverifiedDocuments(organizationId);

    return {
      byType,
      byStatus,
      unsigned: unsignedDocs.length,
      unverified: unverifiedDocs.length,
    };
  }

  // ============================================
  // HELPERS
  // ============================================
  private async generateDocumentNumber(
    organizationId: string,
    documentType: DocumentType,
  ): Promise<string> {
    const prefix = this.getDocumentPrefix(documentType);
    const year = new Date().getFullYear();

    // Get count of documents for this type
    const documents = await this.documentRepository.findByType(documentType);
    const count = documents.filter((d) => d.organizationId === organizationId).length + 1;

    return `${prefix}-${year}-${count.toString().padStart(4, '0')}`;
  }

  private getDocumentPrefix(documentType: DocumentType): string {
    const prefixMap: Record<DocumentType, string> = {
      [DocumentType.CONTRACT]: 'CNT',
      [DocumentType.AGREEMENT]: 'AGR',
      [DocumentType.NDA]: 'NDA',
      [DocumentType.QUOTE]: 'QTE',
      [DocumentType.PROPOSAL]: 'PRP',
      [DocumentType.INVOICE]: 'INV',
      [DocumentType.PAYMENT_RECEIPT]: 'RCT',
      [DocumentType.WCR]: 'WCR',
      [DocumentType.WCR_PRELIMINARY]: 'WCP',
      [DocumentType.WCR_FINAL]: 'WCF',
      [DocumentType.SITE_SURVEY]: 'SSV',
      [DocumentType.TECHNICAL_DRAWING]: 'TDR',
      [DocumentType.INSTALLATION_MANUAL]: 'MNL',
      [DocumentType.COMPLIANCE_CERTIFICATE]: 'CRT',
      [DocumentType.APPROVAL_LETTER]: 'APL',
      [DocumentType.INSPECTION_REPORT]: 'INR',
      [DocumentType.IDENTITY_PROOF]: 'IDP',
      [DocumentType.ADDRESS_PROOF]: 'ADP',
      [DocumentType.ELECTRICITY_BILL]: 'EBL',
      [DocumentType.LOAN_APPLICATION]: 'LAP',
      [DocumentType.LOAN_SANCTION]: 'LSN',
      [DocumentType.LOAN_AGREEMENT]: 'LAG',
      [DocumentType.SUBSIDY_APPLICATION]: 'SAP',
      [DocumentType.SUBSIDY_APPROVAL]: 'SAV',
      [DocumentType.MAINTENANCE_REPORT]: 'MNR',
      [DocumentType.SERVICE_REPORT]: 'SRV',
      [DocumentType.WARRANTY_CERTIFICATE]: 'WRT',
      [DocumentType.OTHER]: 'DOC',
    };

    return prefixMap[documentType] ?? 'DOC';
  }

  private validateStatusTransition(currentStatus: DocumentStatus, newStatus: DocumentStatus): void {
    const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      [DocumentStatus.DRAFT]: [
        DocumentStatus.PENDING_APPROVAL,
        DocumentStatus.SUBMITTED,
        DocumentStatus.ARCHIVED,
      ],
      [DocumentStatus.PENDING_APPROVAL]: [
        DocumentStatus.APPROVED,
        DocumentStatus.REJECTED,
        DocumentStatus.DRAFT,
      ],
      [DocumentStatus.APPROVED]: [DocumentStatus.SUBMITTED, DocumentStatus.ARCHIVED],
      [DocumentStatus.REJECTED]: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
      [DocumentStatus.SUBMITTED]: [DocumentStatus.APPROVED, DocumentStatus.ARCHIVED],
      [DocumentStatus.ARCHIVED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] ?? [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
