import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmployeeProfileKind, UserStatus } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';

import { EmployeeProfileEntity } from '../entities/employee-profile.entity';

@Injectable()
export class EmployeeProfileRepository {
  constructor(
    @InjectRepository(EmployeeProfileEntity)
    public readonly repository: Repository<EmployeeProfileEntity>,
  ) {}

  async findById(id: string): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user'],
    });
  }

  async findByUserAndOrganization(userId: string): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<EmployeeProfileEntity[]> {
    return this.repository.find({
      where: { userId, deletedAt: IsNull() },
      relations: [],
    });
  }

  async findByOrganization(
    page = 1,
    limit = 20,
    status?: UserStatus,
    profileKind?: EmployeeProfileKind,
  ): Promise<{ items: EmployeeProfileEntity[]; total: number; page: number; limit: number }> {
    const whereCondition: Record<string, unknown> = {
      deletedAt: IsNull(),
    };

    if (status) {
      whereCondition.status = status;
    }

    if (profileKind) {
      whereCondition.profileKind = profileKind;
    }

    const [items, total] = await this.repository.findAndCount({
      where: whereCondition,
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, total, page, limit };
  }

  async findByDepartment(department: string): Promise<EmployeeProfileEntity[]> {
    return this.repository.find({
      where: { department, deletedAt: IsNull() },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(profile: Partial<EmployeeProfileEntity>): Promise<EmployeeProfileEntity> {
    const newProfile = this.repository.create(profile);
    return this.repository.save(newProfile);
  }

  async update(
    id: string,
    updates: Partial<EmployeeProfileEntity>,
  ): Promise<EmployeeProfileEntity | null> {
    await this.repository.update({ id }, updates);
    return this.findById(id);
  }

  async updateStatus(id: string, status: UserStatus, updatedBy: string): Promise<boolean> {
    const result = await this.repository.update({ id }, { status, updatedBy });
    return (result.affected ?? 0) > 0;
  }

  async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const result = await this.repository.update(
      { id },
      {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  /**
   * Find by company code (reseller-kind profiles)
   * Ported from ResellerProfileRepository.findByCompanyCode
   */
  async findByCompanyCode(companyCode: string): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({
      where: { companyCode, deletedAt: IsNull() },
    });
  }

  /**
   * Find by email within an organization (used for reseller-kind uniqueness checks)
   * Ported from ResellerProfileRepository.findByEmail
   */
  async findByEmail(email: string): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({
      where: { email, deletedAt: IsNull() },
    });
  }

  /**
   * Find by phone across all organizations (used by auth/OTP flows to verify
   * a phone is registered as a given profile kind)
   */
  async findByPhoneAndKind(
    phone: string,
    profileKind: EmployeeProfileKind,
  ): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({
      where: { phone, profileKind, deletedAt: IsNull() },
    });
  }

  /**
   * Update reseller performance metrics
   * Ported from ResellerProfileRepository.updatePerformanceMetrics
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
    await this.repository.update({ id }, metrics);
  }
}
