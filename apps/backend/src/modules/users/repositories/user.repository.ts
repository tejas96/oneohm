import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserStatus } from '@oneohm-epc/shared-types';
import { FindOptionsWhere, IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import { UserEntity } from '../entities/user.entity';

export type UserSortField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'status'
  | 'createdAt'
  | 'lastLoginAt';
export type SortOrder = 'ASC' | 'DESC';

export interface UserListFilters {
  status?: UserStatus;
  search?: string;
  roleId?: string;
  organizationId?: string;
  showDeleted?: boolean;
  sortBy?: UserSortField;
  sortOrder?: SortOrder;
}

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
    return this.findOneWithIamRoles(
      this.repository
        .createQueryBuilder('user')
        .where('user.email = :email', { email })
        .andWhere('user.deleted_at IS NULL'),
    );
  }

  async findByPhoneWithRoles(phone: string): Promise<UserEntity | null> {
    return this.findOneWithIamRoles(
      this.repository
        .createQueryBuilder('user')
        .where('user.phone = :phone', { phone })
        .andWhere('user.deleted_at IS NULL'),
    );
  }

  async findByIdWithRoles(id: string): Promise<UserEntity | null> {
    return this.findOneWithIamRoles(
      this.repository
        .createQueryBuilder('user')
        .where('user.id = :id', { id })
        .andWhere('user.deleted_at IS NULL'),
    );
  }

  /**
   * Shared helper: executes a user query and attaches IAM role codes/names.
   * JOINs through user_roles.role_id -> roles.code so the result reflects
   * IAM-assigned roles rather than the deprecated user_roles.role column.
   */
  private async findOneWithIamRoles(
    qb: SelectQueryBuilder<UserEntity>,
  ): Promise<UserEntity | null> {
    const result = await qb
      .leftJoin('user_roles', 'ur', 'ur.user_id = user.id')
      .leftJoin('roles', 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
      .addSelect(['ur.role_id', 'r.code', 'r.name', 'ur.role'])
      .getRawAndEntities();

    if (!result.entities.length) return null;

    const userEntity = result.entities[0];
    if (userEntity) {
      userEntity.roles = result.raw
        .map((row: { r_code: string | null; ur_role: string | null }) => row.r_code ?? row.ur_role)
        .filter((r: string | null): r is string => r != null);
    }
    return userEntity ?? null;
  }

  async findAll(page = 1, limit = 20, filters?: UserListFilters): Promise<[UserEntity[], number]> {
    const qb: SelectQueryBuilder<UserEntity> = this.repository
      .createQueryBuilder('user')
      .withDeleted();

    if (filters?.showDeleted) {
      qb.where('user.deleted_at IS NOT NULL');
    } else {
      qb.where('user.deleted_at IS NULL');
    }

    if (filters?.status) {
      qb.andWhere('user.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      qb.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.organizationId) {
      const epDeletedClause = filters?.showDeleted ? '' : ' AND ep.deleted_at IS NULL';
      qb.andWhere(
        `EXISTS (SELECT 1 FROM employee_profiles ep WHERE ep.user_id = user.id AND ep.organization_id = :orgId${epDeletedClause})`,
        { orgId: filters.organizationId },
      );
    }

    if (filters?.roleId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_roles ur_filter WHERE ur_filter.user_id = user.id AND ur_filter.role_id = :roleId)',
        { roleId: filters.roleId },
      );
    }

    const total = await qb.getCount();

    const sortFieldMap: Record<string, string> = {
      firstName: 'user.first_name',
      lastName: 'user.last_name',
      email: 'user.email',
      phone: 'user.phone',
      status: 'user.status',
      createdAt: 'user.created_at',
      lastLoginAt: 'user.last_login_at',
    };
    const sortColumn = sortFieldMap[filters?.sortBy ?? ''] ?? 'user.created_at';
    const sortDirection = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection);
    qb.skip((page - 1) * limit).take(limit);

    const users = await qb.getMany();

    // Batch load roles for all fetched users in a single query
    if (users.length > 0) {
      const userIds = users.map((u) => u.id);
      const roleRows: Array<{
        user_id: string;
        role_code: string | null;
        legacy_role: string | null;
      }> = await this.repository.manager
        .createQueryBuilder()
        .select('ur.user_id', 'user_id')
        .addSelect('r.code', 'role_code')
        .addSelect('ur.role', 'legacy_role')
        .from('user_roles', 'ur')
        .leftJoin('roles', 'r', 'r.id = ur.role_id AND r.deleted_at IS NULL')
        .where('ur.user_id IN (:...userIds)', { userIds })
        .getRawMany();

      const roleMap = new Map<string, string[]>();
      for (const row of roleRows) {
        const code = row.role_code ?? row.legacy_role;
        if (code) {
          const arr = roleMap.get(row.user_id) ?? [];
          arr.push(code);
          roleMap.set(row.user_id, arr);
        }
      }

      for (const user of users) {
        user.roles = roleMap.get(user.id) ?? [];
      }
    }

    return [users, total];
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

  async restore(id: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ deletedAt: null as unknown as Date })
      .where('id = :id', { id })
      .execute();
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
