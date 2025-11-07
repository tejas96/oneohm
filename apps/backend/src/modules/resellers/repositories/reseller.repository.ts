import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ResellerEntity } from '../entities/reseller.entity';

/**
 * Reseller Repository
 * Handles database operations for resellers
 */
@Injectable()
export class ResellerRepository {
  constructor(
    @InjectRepository(ResellerEntity)
    private readonly repository: Repository<ResellerEntity>,
  ) {}

  /**
   * Create a new reseller
   */
  async create(data: Partial<ResellerEntity>): Promise<ResellerEntity> {
    const reseller = this.repository.create(data);
    return this.repository.save(reseller);
  }

  /**
   * Find reseller by ID (excluding soft-deleted records)
   */
  async findById(id: string): Promise<ResellerEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Find all resellers for an organization (excluding soft-deleted records)
   */
  async findAll(organizationId: string): Promise<ResellerEntity[]> {
    return this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find reseller by company code
   */
  async findByCompanyCode(
    organizationId: string,
    companyCode: string,
  ): Promise<ResellerEntity | null> {
    return this.repository.findOne({
      where: { organizationId, companyCode },
    });
  }

  /**
   * Find reseller by email
   */
  async findByEmail(organizationId: string, email: string): Promise<ResellerEntity | null> {
    return this.repository.findOne({
      where: { organizationId, email },
    });
  }

  /**
   * Update reseller
   */
  async update(id: string, data: Partial<ResellerEntity>): Promise<ResellerEntity> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Reseller not found after update');
    }
    return updated;
  }

  /**
   * Soft delete reseller
   */
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  /**
   * Update reseller performance metrics
   */
  async updatePerformanceMetrics(
    id: string,
    metrics: {
      totalLeadsGenerated?: number;
      totalProjectsConverted?: number;
      totalRevenueGenerated?: number;
      totalCommissionEarned?: number;
    },
  ): Promise<void> {
    await this.repository.update(id, metrics);
  }
}
