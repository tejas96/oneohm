import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { UserStatus } from '@oneohm-epc/shared-types';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';

import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    public readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['organization'],
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ['organization'],
    });
  }

  async findByEmailWithRoles(email: string): Promise<UserEntity | null> {
    const user = await this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')
      .leftJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .where('user.email = :email', { email })
      .andWhere('user.deleted_at IS NULL')
      .select(['user', 'organization', 'ur.role'])
      .getRawAndEntities();

    if (!user.entities.length) {
      return null;
    }

    const userEntity = user.entities[0];
    if (userEntity) {
      userEntity.roles = user.raw.map((r: { ur_role: string }) => r.ur_role);
      return userEntity;
    }

    return null;
  }

  async findByIdWithRoles(id: string): Promise<UserEntity | null> {
    const user = await this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')
      .leftJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .where('user.id = :id', { id })
      .andWhere('user.deleted_at IS NULL')
      .select(['user', 'organization', 'ur.role'])
      .getRawAndEntities();

    if (!user.entities.length) {
      return null;
    }

    const userEntity = user.entities[0];
    if (userEntity) {
      userEntity.roles = user.raw.map((r: { ur_role: string }) => r.ur_role);
      return userEntity;
    }

    return null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { phone, deletedAt: IsNull() },
    });
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    status?: UserStatus,
  ): Promise<[UserEntity[], number]> {
    const where: FindOptionsWhere<UserEntity> = {
      organizationId,
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    return this.repository.findAndCount({
      where,
      relations: ['organization'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async create(user: Partial<UserEntity>): Promise<UserEntity> {
    const newUser = this.repository.create(user);
    return this.repository.save(newUser);
  }

  async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
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

  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { lastLoginAt: new Date() });
  }
}
