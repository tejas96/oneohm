import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentEntityType } from '@oneohm-epc/shared/types';
import { In, IsNull, Repository } from 'typeorm';

import { DocumentEntity } from '../entities/document.entity';

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repository: Repository<DocumentEntity>,
  ) {}

  async create(data: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const document = this.repository.create(data);
    return this.repository.save(document);
  }

  async createBulk(items: Partial<DocumentEntity>[]): Promise<DocumentEntity[]> {
    const entities = this.repository.create(items);
    return this.repository.save(entities);
  }

  async findById(id: string, organizationId?: string): Promise<DocumentEntity | null> {
    const where: Record<string, unknown> = { id, deletedAt: IsNull() };
    if (organizationId) where.organizationId = organizationId;
    return this.repository.findOne({ where, relations: ['uploadedByUser'] });
  }

  async findByEntity(
    entityType: DocumentEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<DocumentEntity[]> {
    return this.repository.find({
      where: { entityType, entityId, organizationId, deletedAt: IsNull() },
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByEntityBatch(
    entityType: DocumentEntityType,
    entityIds: string[],
    organizationId: string,
  ): Promise<DocumentEntity[]> {
    if (entityIds.length === 0) return [];
    return this.repository.find({
      where: { entityType, entityId: In(entityIds), organizationId, deletedAt: IsNull() },
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProperty(
    propertyId: string,
    organizationId: string,
    filters?: { entityType?: DocumentEntityType; category?: string; tag?: string },
  ): Promise<DocumentEntity[]> {
    const where: Record<string, unknown> = {
      propertyId,
      organizationId,
      deletedAt: IsNull(),
    };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.category) where.category = filters.category;
    if (filters?.tag) where.tag = filters.tag;

    return this.repository.find({
      where,
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrganization(
    organizationId: string,
    filters?: {
      entityType?: DocumentEntityType;
      category?: string;
      tag?: string;
    },
    page = 1,
    limit = 20,
  ): Promise<[DocumentEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploadedByUser', 'uploader')
      .where('doc.organizationId = :organizationId', { organizationId })
      .andWhere('doc.deletedAt IS NULL');

    if (filters?.entityType)
      qb.andWhere('doc.entityType = :entityType', { entityType: filters.entityType });
    if (filters?.category) qb.andWhere('doc.category = :category', { category: filters.category });
    if (filters?.tag) qb.andWhere('doc.tag = :tag', { tag: filters.tag });

    qb.orderBy('doc.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async update(id: string, data: Record<string, unknown>): Promise<DocumentEntity | null> {
    await this.repository.update({ id, deletedAt: IsNull() }, data);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
