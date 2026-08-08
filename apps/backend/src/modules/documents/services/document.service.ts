import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentEntityType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentEntity } from '../entities/document.entity';
import { DocumentRepository } from '../repositories/document.repository';

@Injectable()
export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateDocumentDto, userId: string): Promise<DocumentEntity> {
    const propertyId =
      dto.propertyId ?? (await this.resolvePropertyId(dto.entityType, dto.entityId));

    const created = await this.documentRepository.create({
      propertyId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      category: dto.category,
      tag: dto.tag,
      fileName: dto.fileName,
      fileUrl: dto.fileUrl,
      fileSizeBytes: dto.fileSizeBytes,
      mimeType: dto.mimeType,
      metadata: dto.metadata,
      notes: dto.notes,
      createdBy: userId,
      updatedBy: userId,
    });
    return created;
  }

  async createBulk(dtos: CreateDocumentDto[], userId: string): Promise<DocumentEntity[]> {
    const items: Partial<DocumentEntity>[] = [];

    for (const dto of dtos) {
      const propertyId =
        dto.propertyId ?? (await this.resolvePropertyId(dto.entityType, dto.entityId));

      items.push({
        propertyId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        category: dto.category,
        tag: dto.tag,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSizeBytes: dto.fileSizeBytes,
        mimeType: dto.mimeType,
        metadata: dto.metadata,
        notes: dto.notes,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    return this.documentRepository.createBulk(items);
  }

  async findByEntity(
    entityType: DocumentEntityType,
    entityId: string,
    filters?: { tag?: string; tags?: string[]; category?: string },
  ): Promise<DocumentEntity[]> {
    return this.documentRepository.findByEntity(entityType, entityId, filters);
  }

  async findByEntityBatch(
    entityType: DocumentEntityType,
    entityIds: string[],
  ): Promise<DocumentEntity[]> {
    return this.documentRepository.findByEntityBatch(entityType, entityIds);
  }

  async findById(id: string): Promise<DocumentEntity> {
    const doc = await this.documentRepository.findById(id);
    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return doc;
  }

  findByProperty(
    propertyId: string,
    filters?: { entityType?: DocumentEntityType; category?: string; tag?: string; tags?: string[] },
  ): Promise<DocumentEntity[]> {
    return this.documentRepository.findByProperty(propertyId, filters);
  }

  async update(id: string, dto: UpdateDocumentDto, userId: string): Promise<DocumentEntity> {
    await this.findById(id);

    const updateData: Record<string, unknown> = { updatedBy: userId };
    if (dto.propertyId !== undefined) updateData.propertyId = dto.propertyId;
    if (dto.entityType !== undefined) updateData.entityType = dto.entityType;
    if (dto.tag !== undefined) updateData.tag = dto.tag;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.documentRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return updated;
  }

  async findByOrganization(
    filters?: { entityType?: DocumentEntityType; category?: string; tag?: string; tags?: string[] },
    page = 1,
    limit = 20,
  ): Promise<[DocumentEntity[], number]> {
    return this.documentRepository.findByOrganization(filters, page, limit);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.documentRepository.softDelete(id);
  }

  async hardDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.documentRepository.hardDelete(id);
  }

  /**
   * Resolves the property_id from entity relationships.
   * Each entity type has a known path back to a customer_properties row.
   */
  private async resolvePropertyId(
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<string> {
    const propertyId = await this.lookupPropertyId(entityType, entityId);
    if (propertyId) return propertyId;

    throw new BadRequestException(
      `Cannot resolve propertyId for entityType=${entityType}, entityId=${entityId}. ` +
        'Pass propertyId explicitly if the entity does not have a direct property relationship.',
    );
  }

  private async lookupPropertyId(
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<string | null> {
    if (entityType === DocumentEntityType.PROPERTY) {
      return entityId;
    }

    let sql: string;

    switch (entityType) {
      case DocumentEntityType.LOAN:
        sql = 'SELECT property_id AS pid FROM loan_applications WHERE id = $1';
        break;
      case DocumentEntityType.PROJECT:
        sql = 'SELECT property_id AS pid FROM projects WHERE id = $1';
        break;
      case DocumentEntityType.QUOTE:
        sql = 'SELECT property_id AS pid FROM quotes WHERE id = $1';
        break;
      case DocumentEntityType.PAYMENT:
        sql = `SELECT p.property_id AS pid FROM payments pay
               JOIN projects p ON pay.project_id = p.id
               WHERE pay.id = $1`;
        break;
      case DocumentEntityType.CUSTOMER:
        sql = `SELECT id AS pid FROM customer_properties
               WHERE customer_id = $1 AND deleted_at IS NULL
               ORDER BY is_primary DESC, created_at ASC
               LIMIT 1`;
        break;
      case DocumentEntityType.LEDGER_ENTRY: {
        // Ledger entries know their project; the property comes through it.
        const ledgerRows = await this.dataSource.query(
          `SELECT p.property_id FROM ledger_entries le
             JOIN projects p ON p.id = le.project_id
            WHERE le.id = $1`,
          [entityId],
        );
        return (ledgerRows[0]?.property_id as string | undefined) ?? null;
      }
      case DocumentEntityType.PROJECT_EXPENSE:
        sql = `SELECT p.property_id AS pid FROM project_expenses pe
               JOIN projects p ON pe.project_id = p.id
               WHERE pe.id = $1`;
        break;
      default:
        return null;
    }

    const rows: Array<{ pid: string | null }> = await this.dataSource.query(sql, [entityId]);
    return rows[0]?.pid ?? null;
  }
}
