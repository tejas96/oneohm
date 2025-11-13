import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ComplianceStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { ComplianceApplicationEntity } from '../entities/compliance-application.entity';

/**
 * Repository for Compliance Applications
 */
@Injectable()
export class ComplianceApplicationRepository {
  constructor(
    @InjectRepository(ComplianceApplicationEntity)
    private readonly repository: Repository<ComplianceApplicationEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(application: Partial<ComplianceApplicationEntity>): Promise<ComplianceApplicationEntity> {
    const entity = this.repository.create(application);
    return this.repository.save(entity);
  }

  async findAll(): Promise<ComplianceApplicationEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: ['organization', 'project', 'submittedByUser', 'createdByUser', 'updatedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ComplianceApplicationEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['organization', 'project', 'submittedByUser', 'createdByUser', 'updatedByUser'],
    });
  }

  async update(id: string, updateData: Partial<ComplianceApplicationEntity>): Promise<ComplianceApplicationEntity | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByOrganization(organizationId: string): Promise<ComplianceApplicationEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: string): Promise<ComplianceApplicationEntity[]> {
    return this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['submittedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByType(applicationType: string): Promise<ComplianceApplicationEntity[]> {
    return this.repository.find({
      where: { applicationType, deletedAt: IsNull() },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: ComplianceStatus): Promise<ComplianceApplicationEntity[]> {
    return this.repository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByApplicationNumber(applicationNumber: string): Promise<ComplianceApplicationEntity | null> {
    return this.repository.findOne({
      where: { applicationNumber, deletedAt: IsNull() },
      relations: ['organization', 'project', 'submittedByUser'],
    });
  }

  // ============================================
  // AUTO-NUMBERING
  // ============================================

  /**
   * Generate next application number
   * Format: CA-{YEAR}-{NUMBER}
   * Example: CA-2024-001, CA-2024-002
   */
  async generateApplicationNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `CA-${currentYear}-`;

    const lastApplication = await this.repository
      .createQueryBuilder('ca')
      .where('ca.application_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ca.application_number', 'DESC')
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

  async countByStatus(status: ComplianceStatus, organizationId?: string): Promise<number> {
    const where: Record<string, unknown> = { status, deletedAt: IsNull() };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.repository.count({ where });
  }
}

