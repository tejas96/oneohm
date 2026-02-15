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
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { email, deletedAt: IsNull() },
    });
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { phone, deletedAt: IsNull() },
    });
  }

  async findByEmailOrPhone(emailOrPhone: string): Promise<UserEntity | null> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.deleted_at IS NULL')
      .andWhere('(user.email = :emailOrPhone OR user.phone = :emailOrPhone)', {
        emailOrPhone,
      })
      .getOne();
  }

  async findByEmailWithRoles(email: string): Promise<UserEntity | null> {
    const user = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .where('user.email = :email', { email })
      .andWhere('user.deleted_at IS NULL')
      .select(['user', 'ur.role'])
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

  async findByPhoneWithRoles(phone: string): Promise<UserEntity | null> {
    const user = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .where('user.phone = :phone', { phone })
      .andWhere('user.deleted_at IS NULL')
      .select(['user', 'ur.role'])
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
      .leftJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .where('user.id = :id', { id })
      .andWhere('user.deleted_at IS NULL')
      .select(['user', 'ur.role'])
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

  async findAll(page = 1, limit = 20, status?: UserStatus): Promise<[UserEntity[], number]> {
    const where: FindOptionsWhere<UserEntity> = {
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    return this.repository.findAndCount({
      where,
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

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.update(
      { id },
      {
        deletedAt: new Date(),
      },
    );
    return (result.affected ?? 0) > 0;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { lastLoginAt: new Date() });
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { emailVerifiedAt: new Date() });
  }

  async verifyPhone(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { phoneVerifiedAt: new Date() });
  }

  async markProfileCompleted(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { profileCompleted: true });
  }

  /**
   * Save user entity (create or update)
   * Used for password reset token storage
   */
  async save(user: UserEntity): Promise<UserEntity> {
    return this.repository.save(user);
  }

  /**
   * Find one user by criteria
   * Used for password reset token lookup
   */
  async findOne(options: { where: FindOptionsWhere<UserEntity> }): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { ...options.where, deletedAt: IsNull() },
    });
  }
}
