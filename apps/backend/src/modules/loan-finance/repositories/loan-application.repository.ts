import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoanStatus } from '@oneohm-epc/shared-types';
import { Between, In, IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { LoanApplicationEntity } from '../entities/loan-application.entity';

/**
 * Repository for Loan Applications
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

  async findAll(): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { deletedAt: IsNull() },
      relations: [
        'organization',
        'project',
        'customer',
        'documents',
        'createdByUser',
        'updatedByUser',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'organization',
        'project',
        'customer',
        'documents',
        'createdByUser',
        'updatedByUser',
      ],
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

  async findByOrganization(organizationId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['project', 'customer', 'documents'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['customer', 'documents'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCustomer(customerId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { customerId, deletedAt: IsNull() },
      relations: ['project', 'documents'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByApplicationNumber(applicationNumber: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { applicationNumber, deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer', 'documents'],
    });
  }

  async findByStatus(status: LoanStatus): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { status, deletedAt: IsNull() },
      relations: ['project', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatuses(statuses: LoanStatus[]): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: { status: In(statuses), deletedAt: IsNull() },
      relations: ['project', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // JAN SAMARTH QUERIES
  // ============================================

  async findByJanSamarthId(janSamarthApplicationId: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({
      where: { janSamarthApplicationId, deletedAt: IsNull() },
      relations: ['organization', 'project', 'customer'],
    });
  }

  async findSubmittedToJanSamarth(): Promise<LoanApplicationEntity[]> {
    return this.repository
      .createQueryBuilder('loan')
      .where('loan.jan_samarth_application_id IS NOT NULL')
      .andWhere('loan.deleted_at IS NULL')
      .leftJoinAndSelect('loan.project', 'project')
      .leftJoinAndSelect('loan.customer', 'customer')
      .orderBy('loan.jan_samarth_submitted_at', 'DESC')
      .getMany();
  }

  async findPendingJanSamarthSubmission(): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: {
        janSamarthApplicationId: IsNull(),
        status: In([LoanStatus.INITIATED, LoanStatus.SUBMITTED]),
        deletedAt: IsNull(),
      },
      relations: ['project', 'customer'],
      order: { createdAt: 'ASC' },
    });
  }

  // ============================================
  // DATE RANGE QUERIES
  // ============================================

  async findByApplicationDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: {
        applicationDate: Between(startDate, endDate),
        deletedAt: IsNull(),
      },
      relations: ['project', 'customer'],
      order: { applicationDate: 'DESC' },
    });
  }

  async findByDisbursementDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<LoanApplicationEntity[]> {
    return this.repository.find({
      where: {
        disbursementDate: Between(startDate, endDate),
        deletedAt: IsNull(),
      },
      relations: ['project', 'customer'],
      order: { disbursementDate: 'DESC' },
    });
  }

  // ============================================
  // SITE VISIT QUERIES
  // ============================================

  async findPendingSiteVisits(): Promise<LoanApplicationEntity[]> {
    return this.repository
      .createQueryBuilder('loan')
      .where('loan.site_visit_scheduled_date IS NOT NULL')
      .andWhere('loan.site_visit_completed_date IS NULL')
      .andWhere('loan.deleted_at IS NULL')
      .leftJoinAndSelect('loan.project', 'project')
      .leftJoinAndSelect('loan.customer', 'customer')
      .orderBy('loan.site_visit_scheduled_date', 'ASC')
      .getMany();
  }

  async findCompletedSiteVisits(): Promise<LoanApplicationEntity[]> {
    return this.repository
      .createQueryBuilder('loan')
      .where('loan.site_visit_completed_date IS NOT NULL')
      .andWhere('loan.deleted_at IS NULL')
      .leftJoinAndSelect('loan.project', 'project')
      .leftJoinAndSelect('loan.customer', 'customer')
      .orderBy('loan.site_visit_completed_date', 'DESC')
      .getMany();
  }

  // ============================================
  // AUTO-NUMBERING
  // ============================================

  /**
   * Generate next application number
   * Format: LA-{YEAR}-{NUMBER}
   * Example: LA-2024-001, LA-2024-002
   */
  async generateApplicationNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `LA-${currentYear}-`;

    // Find the last application number for current year
    const lastApplication = await this.repository
      .createQueryBuilder('loan')
      .where('loan.application_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('loan.application_number', 'DESC')
      .getOne();

    if (!lastApplication) {
      return `${prefix}001`;
    }

    // Extract number from last application number
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

    const totalAmount = applications.reduce((sum, app) => sum + Number(app.loanAmount), 0);
    const totalApproved = applications.reduce(
      (sum, app) => sum + Number(app.approvedAmount || 0),
      0,
    );
    const totalDisbursed = applications.reduce(
      (sum, app) => sum + Number(app.disbursementAmount || 0),
      0,
    );

    return {
      total: applications.length,
      totalAmount,
      totalApproved,
      totalDisbursed,
      byStatus: applications.reduce<Record<string, number>>((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}),
      approvalRate:
        applications.filter(
          (a) => a.status === LoanStatus.APPROVED || a.status === LoanStatus.DISBURSED,
        ).length / (applications.length || 1),
      averageTenure:
        applications.reduce((sum, app) => sum + app.loanTenureMonths, 0) /
        (applications.length || 1),
      janSamarthSubmissions: applications.filter((a) => a.janSamarthApplicationId).length,
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

  async countByStatus(status: LoanStatus, organizationId?: string): Promise<number> {
    const where: Record<string, unknown> = { status, deletedAt: IsNull() };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.repository.count({ where });
  }
}
