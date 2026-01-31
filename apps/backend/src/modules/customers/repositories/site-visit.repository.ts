import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SiteVisitStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { SiteVisitEntity } from '../entities/site-visit.entity';

@Injectable()
export class SiteVisitRepository {
  constructor(
    @InjectRepository(SiteVisitEntity)
    public readonly repository: Repository<SiteVisitEntity>,
  ) {}

  /**
   * Find site visit by ID
   */
  async findById(id: string): Promise<SiteVisitEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['customerProperty', 'customerProperty.customer'],
    });
  }

  /**
   * Find site visit by property ID
   */
  async findByPropertyId(propertyId: string): Promise<SiteVisitEntity | null> {
    return this.repository.findOne({
      where: { customerPropertyId: propertyId, deletedAt: IsNull() },
      relations: ['customerProperty', 'customerProperty.customer'],
    });
  }

  /**
   * Check if property already has a site visit
   */
  async existsByPropertyId(propertyId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { customerPropertyId: propertyId, deletedAt: IsNull() },
    });
    return count > 0;
  }

  /**
   * Find all site visits for a user (via property.createdBy)
   * With optional filters for status and date
   */
  async findByCreatedBy(
    userId: string,
    filters?: {
      status?: SiteVisitStatus;
      date?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<[SiteVisitEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('siteVisit')
      .innerJoinAndSelect('siteVisit.customerProperty', 'property')
      .innerJoinAndSelect('property.customer', 'customer')
      .where('property.createdBy = :userId', { userId })
      .andWhere('siteVisit.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    // Status filter
    if (filters?.status) {
      qb.andWhere('siteVisit.status = :status', { status: filters.status });
    }

    // Date filter (visits created on specific date)
    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);

      qb.andWhere('siteVisit.createdAt BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay,
      });
    }

    qb.orderBy('siteVisit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  /**
   * Find all site visits for an organization
   */
  async findByOrganization(
    organizationId: string,
    filters?: {
      status?: SiteVisitStatus;
    },
    page = 1,
    limit = 20,
  ): Promise<[SiteVisitEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('siteVisit')
      .innerJoinAndSelect('siteVisit.customerProperty', 'property')
      .innerJoinAndSelect('property.customer', 'customer')
      .where('property.organizationId = :organizationId', { organizationId })
      .andWhere('siteVisit.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL');

    if (filters?.status) {
      qb.andWhere('siteVisit.status = :status', { status: filters.status });
    }

    qb.orderBy('siteVisit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  /**
   * Get the next visit number sequence
   * Format: SV-{YEAR}-{SEQUENCE} (global across all organizations)
   */
  async getNextVisitNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `SV-${currentYear}-`;

    // Get the max visit number for current year
    const result = await this.repository
      .createQueryBuilder('siteVisit')
      .select('MAX(siteVisit.visitNumber)', 'maxNumber')
      .where('siteVisit.visitNumber LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne<{ maxNumber: string | null }>();

    let nextSequence = 1;
    if (result?.maxNumber) {
      // Extract sequence number from format SV-2026-00001
      const parts = result.maxNumber.split('-');
      const sequencePart = parts[2];
      if (parts.length === 3 && sequencePart) {
        nextSequence = parseInt(sequencePart, 10) + 1;
      }
    }

    // Pad to 5 digits
    return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
  }

  /**
   * Create a new site visit
   */
  async create(siteVisit: Partial<SiteVisitEntity>): Promise<SiteVisitEntity> {
    const newSiteVisit = this.repository.create(siteVisit);
    return this.repository.save(newSiteVisit);
  }

  /**
   * Update a site visit
   */
  async update(id: string, updates: Partial<SiteVisitEntity>): Promise<SiteVisitEntity | null> {
    // Use type assertion to avoid TypeScript recursion issues with circular entity references
    await this.repository.update({ id }, updates as Record<string, unknown>);
    return this.findById(id);
  }

  /**
   * Soft delete a site visit
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.update({ id }, { deletedAt: new Date() });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Count site visits by status for a user
   */
  async countByStatusForUser(
    userId: string,
  ): Promise<{ status: SiteVisitStatus; count: number }[]> {
    const result = await this.repository
      .createQueryBuilder('siteVisit')
      .innerJoin('siteVisit.customerProperty', 'property')
      .select('siteVisit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('property.createdBy = :userId', { userId })
      .andWhere('siteVisit.deletedAt IS NULL')
      .andWhere('property.deletedAt IS NULL')
      .groupBy('siteVisit.status')
      .getRawMany<{ status: SiteVisitStatus; count: string }>();

    return result.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
  }
}
