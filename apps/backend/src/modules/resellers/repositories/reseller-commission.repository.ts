import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommissionStatus } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { ResellerCommissionEntity } from '../entities/reseller-commission.entity';

/**
 * Reseller Commission Repository
 * Handles database operations for reseller commissions
 */
@Injectable()
export class ResellerCommissionRepository {
  constructor(
    @InjectRepository(ResellerCommissionEntity)
    private readonly repository: Repository<ResellerCommissionEntity>,
  ) {}

  /**
   * Create a new commission record
   */
  async create(data: Partial<ResellerCommissionEntity>): Promise<ResellerCommissionEntity> {
    const commission = this.repository.create(data);
    return this.repository.save(commission);
  }

  /**
   * Find commission by ID (excluding soft-deleted records)
   */
  async findById(id: string): Promise<ResellerCommissionEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['reseller'],
    });
  }

  /**
   * Find all commissions for an organization (excluding soft-deleted records)
   */
  async findAll(organizationId: string): Promise<ResellerCommissionEntity[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ['reseller'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all commissions for a specific reseller
   */
  async findByResellerId(resellerId: string): Promise<ResellerCommissionEntity[]> {
    return this.repository.find({
      where: { resellerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find commissions by status
   */
  async findByStatus(
    organizationId: string,
    status: CommissionStatus,
  ): Promise<ResellerCommissionEntity[]> {
    return this.repository.find({
      where: { organizationId, status },
      relations: ['reseller'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update commission
   */
  async update(
    id: string,
    data: Partial<ResellerCommissionEntity>,
  ): Promise<ResellerCommissionEntity> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Commission not found after update');
    }
    return updated;
  }

  /**
   * Soft delete commission
   */
  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  /**
   * Calculate total commission earned by a reseller
   */
  async getTotalCommissionEarned(resellerId: string, status: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('commission')
      .select('SUM(commission.commission_amount)', 'total')
      .where('commission.reseller_id = :resellerId', { resellerId })
      .andWhere('commission.status = :status', { status })
      .andWhere('commission.deleted_at IS NULL')
      .getRawOne<{ total: string | null }>();

    return parseFloat(result?.total ?? '0');
  }
}
