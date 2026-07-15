import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommissionStatus } from '@tejas96/shared/types';
import { Repository } from 'typeorm';

import { EmployeeCommissionEntity } from '../entities/employee-commission.entity';

/**
 * Employee Commission Repository
 * Handles database operations for employee (reseller-kind) commissions.
 * Renamed from ResellerCommissionRepository.
 */
@Injectable()
export class EmployeeCommissionRepository {
  constructor(
    @InjectRepository(EmployeeCommissionEntity)
    private readonly repository: Repository<EmployeeCommissionEntity>,
  ) {}

  /**
   * Create a new commission record
   */
  async create(data: Partial<EmployeeCommissionEntity>): Promise<EmployeeCommissionEntity> {
    const commission = this.repository.create(data);
    return this.repository.save(commission);
  }

  /**
   * Find commission by ID (excluding soft-deleted records)
   */
  async findById(id: string): Promise<EmployeeCommissionEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['employee'],
    });
  }

  /**
   * Find all commissions for an organization (excluding soft-deleted records)
   */
  async findAll(organizationId: string): Promise<EmployeeCommissionEntity[]> {
    return this.repository.find({
      where: { organizationId },
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all commissions for a specific employee (reseller-kind profile)
   */
  async findByEmployeeId(employeeId: string): Promise<EmployeeCommissionEntity[]> {
    return this.repository.find({
      where: { employeeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find commissions by status
   */
  async findByStatus(
    organizationId: string,
    status: CommissionStatus,
  ): Promise<EmployeeCommissionEntity[]> {
    return this.repository.find({
      where: { organizationId, status },
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update commission
   */
  async update(
    id: string,
    data: Partial<EmployeeCommissionEntity>,
  ): Promise<EmployeeCommissionEntity> {
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
   * Calculate total commission earned by an employee (reseller-kind profile)
   */
  async getTotalCommissionEarned(employeeId: string, status: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('commission')
      .select('SUM(commission.commission_amount)', 'total')
      .where('commission.employee_id = :employeeId', { employeeId })
      .andWhere('commission.status = :status', { status })
      .andWhere('commission.deleted_at IS NULL')
      .getRawOne<{ total: string | null }>();

    return parseFloat(result?.total ?? '0');
  }
}
