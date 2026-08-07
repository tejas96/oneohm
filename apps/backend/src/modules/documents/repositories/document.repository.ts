import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentEntityType } from '@tejas96/shared/types';
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

  async findById(id: string): Promise<DocumentEntity | null> {
    const where: Record<string, unknown> = { id, deletedAt: IsNull() };
    return this.repository.findOne({ where, relations: ['uploadedByUser'] });
  }

  async findByEntity(
    entityType: DocumentEntityType,
    entityId: string,
    filters?: { tag?: string; tags?: string[]; category?: string },
  ): Promise<DocumentEntity[]> {
    const where: Record<string, unknown> = {
      entityType,
      entityId,
      deletedAt: IsNull(),
    };
    if (filters?.tags?.length) {
      where.tag = In(filters.tags);
    } else if (filters?.tag) {
      where.tag = filters.tag;
    }
    if (filters?.category) where.category = filters.category;
    return this.repository.find({
      where,
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByEntityBatch(
    entityType: DocumentEntityType,
    entityIds: string[],
  ): Promise<DocumentEntity[]> {
    if (entityIds.length === 0) return [];
    return this.repository.find({
      where: { entityType, entityId: In(entityIds), deletedAt: IsNull() },
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProperty(
    propertyId: string,
    filters?: { entityType?: DocumentEntityType; category?: string; tag?: string; tags?: string[] },
  ): Promise<DocumentEntity[]> {
    const where: Record<string, unknown> = {
      propertyId,
      deletedAt: IsNull(),
    };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.category) where.category = filters.category;
    if (filters?.tags?.length) {
      where.tag = In(filters.tags);
    } else if (filters?.tag) {
      where.tag = filters.tag;
    }

    return this.repository.find({
      where,
      relations: ['uploadedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrganization(
    filters?: {
      entityType?: DocumentEntityType;
      category?: string;
      tag?: string;
      tags?: string[];
    },
    page = 1,
    limit = 20,
  ): Promise<[DocumentEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploadedByUser', 'uploader')
      .andWhere('doc.deletedAt IS NULL');

    if (filters?.entityType)
      qb.andWhere('doc.entityType = :entityType', { entityType: filters.entityType });
    if (filters?.category) qb.andWhere('doc.category = :category', { category: filters.category });
    if (filters?.tags?.length) {
      qb.andWhere('doc.tag IN (:...tags)', { tags: filters.tags });
    } else if (filters?.tag) {
      qb.andWhere('doc.tag = :tag', { tag: filters.tag });
    }

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

  async hardDelete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
