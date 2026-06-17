import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SiteActivityStatus } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';

import { SiteActivityEntity } from '../entities/site-activity.entity';

@Injectable()
export class SiteActivityRepository {
  constructor(
    @InjectRepository(SiteActivityEntity)
    public readonly repository: Repository<SiteActivityEntity>,
  ) {}

  async findById(id: string): Promise<SiteActivityEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customerProperty', 'customerProperty.customer'],
    });
  }

  async findByPropertyId(propertyId: string): Promise<SiteActivityEntity | null> {
    return this.repository.findOne({
      where: { customerPropertyId: propertyId, deletedAt: IsNull() },
      relations: ['customerProperty', 'customerProperty.customer'],
    });
  }

  async existsByPropertyId(propertyId: string, organizationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { customerPropertyId: propertyId, organizationId, deletedAt: IsNull() },
    });
    return count > 0;
  }

  async findByOrganization(
    organizationId: string,
    filters?: {
      overallStatus?: SiteActivityStatus;
      propertyId?: string;
      isSiteVisitDone?: boolean;
      isSiteSurveyDone?: boolean;
    },
    page = 1,
    limit = 20,
  ): Promise<[SiteActivityEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('activity')
      .innerJoinAndSelect('activity.customerProperty', 'property')
      .innerJoinAndSelect('property.customer', 'customer')
      .where('activity.organizationId = :organizationId', { organizationId })
      .andWhere('activity.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    if (filters?.overallStatus) {
      qb.andWhere('activity.overallStatus = :overallStatus', {
        overallStatus: filters.overallStatus,
      });
    }
    if (filters?.propertyId) {
      qb.andWhere('activity.customerPropertyId = :propertyId', { propertyId: filters.propertyId });
    }
    if (filters?.isSiteVisitDone !== undefined) {
      qb.andWhere('activity.isSiteVisitDone = :isSiteVisitDone', {
        isSiteVisitDone: filters.isSiteVisitDone,
      });
    }
    if (filters?.isSiteSurveyDone !== undefined) {
      qb.andWhere('activity.isSiteSurveyDone = :isSiteSurveyDone', {
        isSiteSurveyDone: filters.isSiteSurveyDone,
      });
    }

    qb.orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async findByCreatedBy(
    organizationId: string,
    userId: string,
    filters?: { overallStatus?: SiteActivityStatus; date?: Date },
    page = 1,
    limit = 20,
  ): Promise<[SiteActivityEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('activity')
      .innerJoinAndSelect('activity.customerProperty', 'property')
      .innerJoinAndSelect('property.customer', 'customer')
      .where('activity.organizationId = :organizationId', { organizationId })
      .andWhere('property.createdBy = :userId', { userId })
      .andWhere('activity.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    if (filters?.overallStatus) {
      qb.andWhere('activity.overallStatus = :overallStatus', {
        overallStatus: filters.overallStatus,
      });
    }

    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      qb.andWhere('activity.createdAt BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay });
    }

    qb.orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async createInTransaction(data: Partial<SiteActivityEntity>): Promise<SiteActivityEntity> {
    return this.repository.manager.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext('site_activity_number'))`);

      const currentYear = new Date().getFullYear();
      const prefix = `SA-${currentYear}-`;

      const result = await manager.query(
        `SELECT activity_number as "maxNumber"
         FROM site_activities
         WHERE activity_number LIKE $1
           AND deleted_at IS NULL
         ORDER BY activity_number DESC
         LIMIT 1`,
        [`${prefix}%`],
      );

      let nextSequence = 1;
      const maxNumber = result?.[0]?.maxNumber;
      if (maxNumber) {
        const parts = maxNumber.split('-');
        const sequencePart = parts[2];
        if (parts.length === 3 && sequencePart) {
          nextSequence = parseInt(sequencePart, 10) + 1;
        }
      }

      const activityNumber = `${prefix}${nextSequence.toString().padStart(5, '0')}`;
      const entity = manager.create(SiteActivityEntity, { ...data, activityNumber });
      return manager.save(entity);
    });
  }

  async update(
    id: string,
    updates: Partial<SiteActivityEntity>,
  ): Promise<SiteActivityEntity | null> {
    await this.repository.update({ id }, updates as Record<string, unknown>);
    return this.findById(id);
  }

  async softDelete(id: string, deletedBy?: string): Promise<boolean> {
    const result = await this.repository.update(
      { id },
      { deletedAt: new Date(), updatedBy: deletedBy },
    );
    return (result.affected ?? 0) > 0;
  }

  async countByStatusForUser(
    organizationId: string,
    userId: string,
  ): Promise<{ status: SiteActivityStatus; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('activity')
      .innerJoin('activity.customerProperty', 'property')
      .select('activity.overallStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('activity.organizationId = :organizationId', { organizationId })
      .andWhere('property.createdBy = :userId', { userId })
      .andWhere('activity.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL')
      .groupBy('activity.overallStatus')
      .getRawMany<{ status: SiteActivityStatus; count: string }>();

    return result.map((r) => ({ status: r.status, count: parseInt(r.count, 10) }));
  }
}
