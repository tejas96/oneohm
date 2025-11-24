import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import { IsNull, Repository } from 'typeorm';

import { CustomerProfileEntity } from '../entities/customer-profile.entity';

@Injectable()
export class CustomerProfileRepository {
  constructor(
    @InjectRepository(CustomerProfileEntity)
    public readonly repository: Repository<CustomerProfileEntity>,
  ) {}

  async findById(id: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['user', 'organization'],
    });
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { userId, organizationId, deletedAt: IsNull() },
      relations: ['user', 'organization'],
    });
  }

  async findByUserId(userId: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { userId, deletedAt: IsNull() },
      relations: ['organization'],
    });
  }

  async findByOrganization(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<[CustomerProfileEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async create(profile: Partial<CustomerProfileEntity>): Promise<CustomerProfileEntity> {
    const newProfile = this.repository.create(profile);
    return this.repository.save(newProfile);
  }

  async update(
    id: string,
    updates: Partial<CustomerProfileEntity>,
  ): Promise<CustomerProfileEntity | null> {
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

  async findAll(organizationId: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['user', 'organization', 'reseller'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPhone(organizationId: string, phone: string): Promise<CustomerProfileEntity[]> {
    return this.repository.find({
      where: { organizationId, phone, deletedAt: IsNull() },
    });
  }

  async findByEmail(organizationId: string, email: string): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { organizationId, email, deletedAt: IsNull() },
    });
  }

  async findByConsumerNumber(
    organizationId: string,
    consumerNumber: string,
  ): Promise<CustomerProfileEntity | null> {
    return this.repository.findOne({
      where: { organizationId, consumerNumber, deletedAt: IsNull() },
    });
  }

  async countByStatus(organizationId: string, status: CustomerStatus): Promise<number> {
    return this.repository.count({
      where: { organizationId, status, deletedAt: IsNull() },
    });
  }
}
