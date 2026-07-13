import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoanStatus } from '@tejas96/shared/types';
import { IsNull, Repository, type EntityManager } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { LoanApplicationEntity } from '../entities/loan-application.entity';

/**
 * Repository for Loan Applications
 * Simplified for tracking customer loan interest with external banks
 */
@Injectable()
export class LoanApplicationRepository {
  constructor(
    @InjectRepository(LoanApplicationEntity)
    private readonly repository: Repository<LoanApplicationEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(application: Partial<LoanApplicationEntity>): Promise<LoanApplicationEntity> {
    const entity = this.repository.create(application);
    return this.repository.save(entity);
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<[LoanApplicationEntity[], number]> {
    return this.repository.findAndCount({
      where: {
        deletedAt: IsNull(),
        property: { organizationId },
      },
      relations: ['property', 'customer', 'createdByUser', 'updatedByUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, organizationId?: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
        ...(organizationId ? { property: { organizationId } } : {}),
      },
      relations: ['property', 'customer', 'createdByUser', 'updatedByUser'],
    });
  }

  async update(
    id: string,
    updateData: Partial<LoanApplicationEntity>,
  ): Promise<LoanApplicationEntity | null> {
    await this.repository.update(id, updateData as QueryDeepPartialEntity<LoanApplicationEntity>);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByProperty(
    propertyId: string,
    organizationId?: string,
    manager?: EntityManager,
  ): Promise<LoanApplicationEntity | null> {
    const repo = manager ? manager.getRepository(LoanApplicationEntity) : this.repository;
    return repo.findOne({
      where: {
        propertyId,
        deletedAt: IsNull(),
        ...(organizationId ? { property: { organizationId } } : {}),
      },
      relations: ['property', 'customer'],
    });
  }

  async findPropertyIdsWithActiveLoans(
    propertyIds: string[],
    organizationId: string,
    manager?: EntityManager,
  ): Promise<Set<string>> {
    if (propertyIds.length === 0) {
      return new Set();
    }

    const rows = await (manager ?? this.repository.manager)
      .getRepository(LoanApplicationEntity)
      .createQueryBuilder('loan')
      .select('loan.propertyId', 'propertyId')
      .innerJoin('loan.property', 'property')
      .where('loan.propertyId IN (:...propertyIds)', { propertyIds })
      .andWhere('loan.deletedAt IS NULL')
      .andWhere('property.organizationId = :organizationId', { organizationId })
      .andWhere('loan.status IN (:...statuses)', {
        statuses: [LoanStatus.INITIATED, LoanStatus.APPLIED],
      })
      .getRawMany<{ propertyId: string }>();

    return new Set(rows.map((row) => row.propertyId));
  }

  async findByCustomer(
    customerId: string,
    organizationId?: string,
  ): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: {
        customerId,
        deletedAt: IsNull(),
        ...(organizationId ? { property: { organizationId } } : {}),
      },
      relations: ['property'],
      order: { createdAt: 'DESC' },
    });
  }
}
