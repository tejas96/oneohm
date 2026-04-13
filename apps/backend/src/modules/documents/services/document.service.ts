import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentEntityType } from '@oneohm-epc/shared/types';
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
    if (!dto.organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const propertyId =
      dto.propertyId ?? (await this.resolvePropertyId(dto.entityType, dto.entityId));

    const created = await this.documentRepository.create({
      organizationId: dto.organizationId,
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
        organizationId: dto.organizationId,
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
    organizationId: string,
  ): Promise<DocumentEntity[]> {
    return this.documentRepository.findByEntity(entityType, entityId, organizationId);
  }

  async findByEntityBatch(
    entityType: DocumentEntityType,
    entityIds: string[],
    organizationId: string,
  ): Promise<DocumentEntity[]> {
    return this.documentRepository.findByEntityBatch(entityType, entityIds, organizationId);
  }

  async findById(id: string, organizationId: string): Promise<DocumentEntity> {
    const doc = await this.documentRepository.findById(id, organizationId);
    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return doc;
  }

  findByProperty(
    propertyId: string,
    organizationId: string,
    filters?: { entityType?: DocumentEntityType; category?: string; tag?: string },
  ): Promise<DocumentEntity[]> {
    return this.documentRepository.findByProperty(propertyId, organizationId, filters);
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    userId: string,
    organizationId: string,
  ): Promise<DocumentEntity> {
    await this.findById(id, organizationId);

    const updateData: Record<string, unknown> = { updatedBy: userId };
    if (dto.propertyId !== undefined) updateData.propertyId = dto.propertyId;
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
    organizationId: string,
    filters?: { entityType?: DocumentEntityType; category?: string; tag?: string },
    page = 1,
    limit = 20,
  ): Promise<[DocumentEntity[], number]> {
    return this.documentRepository.findByOrganization(organizationId, filters, page, limit);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.documentRepository.softDelete(id);
  }

  async hardDelete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
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
      case DocumentEntityType.SITE_ACTIVITY:
        sql = 'SELECT customer_property_id AS pid FROM site_activities WHERE id = $1';
        break;
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
      default:
        return null;
    }

    const rows: Array<{ pid: string | null }> = await this.dataSource.query(sql, [entityId]);
    return rows[0]?.pid ?? null;
  }
}
