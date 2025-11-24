import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
      relations: ['user', 'organization'],
    });
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<EmployeeProfileEntity | null> {
    return this.repository.findOne({
      where: { userId, organizationId, deletedAt: IsNull() },
      relations: ['user', 'organization'],
    });
  }

  async findByUserId(userId: string): Promise<EmployeeProfileEntity[]> {
    return this.repository.find({
      where: { userId, deletedAt: IsNull() },
      relations: ['organization'],
    });
  }

  async findByOrganization(
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<[EmployeeProfileEntity[], number]> {
    return this.repository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
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
}
