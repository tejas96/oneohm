// ============================================
// IMPORTS
// ============================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentStatus, DocumentType } from '@oneohm-epc/shared/types';
import { IsNull, Repository } from 'typeorm';

import { DocumentEntity } from '../entities/document.entity';

/**
 * DocumentRepository
 * Handles database operations for documents with version control
 */
@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repository: Repository<DocumentEntity>,
  ) {}

  // ============================================
  // CREATE
  // ============================================
  async create(data: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const document = this.repository.create(data);
    return this.repository.save(document);
  }

  // ============================================
  // READ - BASIC
  // ============================================
  async findById(id: string): Promise<DocumentEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['createdByUser', 'updatedByUser', 'signedByUser', 'parentDocument'],
    });
  }

  async findAll(): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByDocumentNumber(documentNumber: string): Promise<DocumentEntity | null> {
    return this.repository.findOne({
      where: { documentNumber, deletedAt: IsNull() },
      relations: ['createdByUser', 'signedByUser'],
    });
  }

  // ============================================
  // READ - BY FILTERS
  // ============================================
  async findByOrganization(organizationId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: string, organizationId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { projectId, organizationId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomer(customerId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByQuote(quoteId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { quoteId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPayment(paymentId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { paymentId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByType(documentType: DocumentType): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { documentType, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: DocumentStatus): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // VERSION CONTROL QUERIES
  // ============================================
  /**
   * Find all versions of a document
   */
  async findVersions(parentDocumentId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { parentDocumentId, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { version: 'ASC' },
    });
  }

  /**
   * Find latest version of a document
   */
  async findLatestVersion(parentDocumentId: string): Promise<DocumentEntity | null> {
    return this.repository.findOne({
      where: { parentDocumentId, isLatestVersion: true, deletedAt: IsNull() },
      relations: ['createdByUser'],
    });
  }

  /**
   * Get next version number for a document
   */
  async getNextVersionNumber(parentDocumentId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('document')
      .select('MAX(document.version)', 'maxVersion')
      .where('document.parent_document_id = :parentDocumentId', { parentDocumentId })
      .andWhere('document.deleted_at IS NULL')
      .getRawOne<{ maxVersion: number }>();

    return (result?.maxVersion ?? 0) + 1;
  }

  /**
   * Mark all versions as not latest
   */
  async markAllVersionsAsNotLatest(parentDocumentId: string): Promise<void> {
    await this.repository.update(
      { parentDocumentId, deletedAt: IsNull() },
      { isLatestVersion: false },
    );
  }

  // ============================================
  // WCR SPECIFIC QUERIES
  // ============================================
  async findByWcrSession(wcrSessionNumber: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { wcrSessionNumber, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // SIGNATURE & OTP QUERIES
  // ============================================
  async findUnsignedDocuments(organizationId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { organizationId, isSigned: false, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findUnverifiedDocuments(organizationId: string): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { organizationId, isOtpVerified: false, deletedAt: IsNull() },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: string, data: Record<string, unknown>): Promise<DocumentEntity | null> {
    await this.repository.update({ id, deletedAt: IsNull() }, data);
    return this.findById(id);
  }

  // ============================================
  // DELETE (SOFT)
  // ============================================
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  // ============================================
  // STATISTICS
  // ============================================
  async countByType(organizationId: string): Promise<{ type: DocumentType; count: number }[]> {
    const results = await this.repository
      .createQueryBuilder('document')
      .select('document.document_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('document.organization_id = :organizationId', { organizationId })
      .andWhere('document.deleted_at IS NULL')
      .groupBy('document.document_type')
      .getRawMany<{ type: DocumentType; count: string }>();

    return results.map((r) => ({
      type: r.type,
      count: parseInt(r.count, 10),
    }));
  }

  async countByStatus(
    organizationId: string,
  ): Promise<{ status: DocumentStatus; count: number }[]> {
    const results = await this.repository
      .createQueryBuilder('document')
      .select('document.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('document.organization_id = :organizationId', { organizationId })
      .andWhere('document.deleted_at IS NULL')
      .groupBy('document.status')
      .getRawMany<{ status: DocumentStatus; count: string }>();

    return results.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
  }
}
