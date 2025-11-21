import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ResellerProfileEntity } from '../entities/reseller-profile.entity';

@Injectable()
export class ResellerProfileRepository {
  constructor(
    @InjectRepository(ResellerProfileEntity)
    public readonly repository: Repository<ResellerProfileEntity>,
  ) {}

  async findById(id: string): Promise<ResellerProfileEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user', 'organization'],
    });
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<ResellerProfileEntity | null> {
    return this.repository.findOne({
      where: { userId, organizationId, deletedAt: IsNull() },
      relations: ['user', 'organization'],
    });
  }

  async findByUserId(userId: string): Promise<ResellerProfileEntity[]> {
    return this.repository.find({
      where: { userId, deletedAt: IsNull() },
      relations: ['organization'],
    });
  }

  async findByOrganization(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<[ResellerProfileEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async create(profile: Partial<ResellerProfileEntity>): Promise<ResellerProfileEntity> {
    const newProfile = this.repository.create(profile);
    return this.repository.save(newProfile);
  }

  async update(
    id: string,
    updates: Partial<ResellerProfileEntity>,
  ): Promise<ResellerProfileEntity | null> {
    await this.repository.update({ id }, updates);
    return this.findById(id);
  }

  async softDelete(id: string, deletedBy?: string): Promise<boolean> {
    const result = await this.repository.update(
      { id },
      {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
    );
    return (result.affected ?? 0) > 0;
  }

  async findAll(organizationId: string): Promise<ResellerProfileEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['user', 'organization'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompanyCode(
    organizationId: string,
    companyCode: string,
  ): Promise<ResellerProfileEntity | null> {
    return this.repository.findOne({
      where: { organizationId, companyCode, deletedAt: IsNull() },
    });
  }

  async findByEmail(
    organizationId: string,
    email: string,
  ): Promise<ResellerProfileEntity | null> {
    return this.repository.findOne({
      where: { organizationId, email, deletedAt: IsNull() },
    });
  }

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

