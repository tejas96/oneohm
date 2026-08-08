import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InspectionStatus } from '@tejas96/shared/types';
import { Between, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { InspectionEntity } from '../entities/inspection.entity';

/**
 * Repository for Inspections
 */
@Injectable()
export class InspectionRepository {
  constructor(
    @InjectRepository(InspectionEntity)
    private readonly repository: Repository<InspectionEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(inspection: Partial<InspectionEntity>): Promise<InspectionEntity> {
    const entity = this.repository.create(inspection);
    return this.repository.save(entity);
  }

  async findAll(): Promise<InspectionEntity[]> {
    return this.repository.find({
      relations: ['project', 'createdByUser', 'updatedByUser'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async findById(id: string): Promise<InspectionEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['project', 'createdByUser', 'updatedByUser'],
    });
  }

  async update(
    id: string,
    updateData: Partial<InspectionEntity>,
  ): Promise<InspectionEntity | null> {
    await this.repository.update(id, updateData as QueryDeepPartialEntity<InspectionEntity>);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByOrganization(): Promise<InspectionEntity[]> {
    return this.repository.find({
      relations: ['project'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async findByProject(projectId: string): Promise<InspectionEntity[]> {
    return this.repository.find({
      where: { projectId },
      order: { scheduledDate: 'DESC' },
    });
  }

  async findByType(inspectionType: string): Promise<InspectionEntity[]> {
    return this.repository.find({
      where: { inspectionType },
      relations: ['project'],
      order: { scheduledDate: 'DESC' },
    });
  }

  async findByStatus(status: InspectionStatus): Promise<InspectionEntity[]> {
    return this.repository.find({
      where: { status },
      relations: ['project'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async findByInspectionNumber(inspectionNumber: string): Promise<InspectionEntity | null> {
    return this.repository.findOne({
      where: { inspectionNumber },
      relations: ['project'],
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<InspectionEntity[]> {
    return this.repository.find({
      where: { scheduledDate: Between(startDate, endDate) },
      relations: ['project'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async findUpcoming(): Promise<InspectionEntity[]> {
    const today = new Date();
    return this.repository
      .createQueryBuilder('inspection')
      .where('inspection.scheduled_date >= :today', { today })
      .andWhere('inspection.status IN (:...statuses)', {
        statuses: [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS],
      })
      .leftJoinAndSelect('inspection.project', 'project')
      .orderBy('inspection.scheduledDate', 'ASC')
      .getMany();
  }

  async findPending(): Promise<InspectionEntity[]> {
    return this.repository.find({
      where: { status: InspectionStatus.SCHEDULED },
      relations: ['project'],
      order: { scheduledDate: 'ASC' },
    });
  }

  // ============================================
  // AUTO-NUMBERING
  // ============================================

  /**
   * Generate next inspection number
   * Format: IN-{YEAR}-{NUMBER}
   * Example: IN-2024-001, IN-2024-002
   */
  async generateInspectionNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `IN-${currentYear}-`;

    const lastInspection = await this.repository
      .createQueryBuilder('inspection')
      .where('inspection.inspection_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('inspection.inspectionNumber', 'DESC')
      .getOne();

    if (!lastInspection) {
      return `${prefix}001`;
    }

    const parts = lastInspection.inspectionNumber.split('-');
    const lastNumber = parseInt(parts[2] || '0', 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // ============================================
  // STATISTICS
  // ============================================

  async countByOrganization(): Promise<number> {
    return this.repository.count();
  }

  async countByProject(projectId: string): Promise<number> {
    return this.repository.count({ where: { projectId } });
  }

  async countByStatus(status: InspectionStatus): Promise<number> {
    const where: Record<string, unknown> = { status };
    return this.repository.count({ where });
  }
}
