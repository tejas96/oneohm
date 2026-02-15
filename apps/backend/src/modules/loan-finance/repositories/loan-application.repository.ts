import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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

  async findAll(page = 1, limit = 20): Promise<[LoanApplicationEntity[], number]> {
    return this.repository.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['property', 'customer', 'createdByUser', 'updatedByUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
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

  async findByProperty(propertyId: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { propertyId, deletedAt: IsNull() },
      relations: ['property', 'customer'],
    });
  }

  async findByCustomer(customerId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: ['property'],
      order: { createdAt: 'DESC' },
    });
  }
}
