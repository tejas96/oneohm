import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubsidyStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { SubsidyApplicationEntity } from '../entities/subsidy-application.entity';

/**
 * Repository for Subsidy Applications
 */
@Injectable()
export class SubsidyApplicationRepository {
  constructor(
    @InjectRepository(SubsidyApplicationEntity)
    private readonly repository: Repository<SubsidyApplicationEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(application: Partial<SubsidyApplicationEntity>): Promise<SubsidyApplicationEntity> {
    const entity = this.repository.create(application);
    return this.repository.save(entity);
  }

  async findAll(): Promise<SubsidyApplicationEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer', 'createdByUser', 'updatedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<SubsidyApplicationEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer', 'createdByUser', 'updatedByUser'],
    });
  }

  async update(id: string, updateData: Partial<SubsidyApplicationEntity>): Promise<SubsidyApplicationEntity | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.update(id, updateData as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByOrganization(organizationId: string): Promise<SubsidyApplicationEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['project', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: string): Promise<SubsidyApplicationEntity[]> {
    return this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomer(customerId: string): Promise<SubsidyApplicationEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: SubsidyStatus): Promise<SubsidyApplicationEntity[]> {
    return this.repository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['project', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByApplicationNumber(applicationNumber: string): Promise<SubsidyApplicationEntity | null> {
    return this.repository.findOne({
      where: { applicationNumber, deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer'],
    });
  }

  async findByPortal(portalName: string): Promise<SubsidyApplicationEntity[]> {
    return this.repository.find({
      where: { portalName, deletedAt: IsNull() },
      relations: ['project', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // AUTO-NUMBERING
  // ============================================

  /**
   * Generate next application number
   * Format: SUB-{YEAR}-{NUMBER}
   * Example: SUB-2024-001, SUB-2024-002
   */
  async generateApplicationNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `SUB-${currentYear}-`;

    const lastApplication = await this.repository
      .createQueryBuilder('sub')
      .where('sub.application_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('sub.application_number', 'DESC')
      .getOne();

    if (!lastApplication) {
      return `${prefix}001`;
    }

    const parts = lastApplication.applicationNumber.split('-');
    const lastNumber = parseInt(parts[2] || '0', 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatsByOrganization(organizationId: string): Promise<Record<string, unknown>> {
    const applications = await this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
    });

    const totalApplied = applications.reduce((sum, app) => sum + Number(app.appliedAmount), 0);
    const totalApproved = applications.reduce((sum, app) => sum + Number(app.approvedAmount || 0), 0);
    const totalDisbursed = applications.reduce((sum, app) => sum + Number(app.disbursementAmount || 0), 0);

    return {
      total: applications.length,
      totalApplied,
      totalApproved,
      totalDisbursed,
      byStatus: applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}),
      approvalRate:
        applications.filter((a) => a.status === SubsidyStatus.APPROVED || a.status === SubsidyStatus.DISBURSED).length /
        (applications.length || 1),
    };
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.repository.count({
      where: { organizationId, deletedAt: IsNull() },
    });
  }

  async countByProject(projectId: string): Promise<number> {
    return this.repository.count({
      where: { projectId, deletedAt: IsNull() },
    });
  }

  async countByStatus(status: SubsidyStatus, organizationId?: string): Promise<number> {
    const where: Record<string, unknown> = { status, deletedAt: IsNull() };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.repository.count({ where });
  }
}

