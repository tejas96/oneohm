import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRoleEntity } from '../entities/user-role.entity';

@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectRepository(UserRoleEntity)
    public readonly repository: Repository<UserRoleEntity>,
  ) {}

  async findByUserId(userId: string): Promise<UserRoleEntity[]> {
    return this.repository.find({
      where: { userId },
    });
  }

  async createUserRoles(
    userId: string,
    roles: string[],
    createdBy: string,
  ): Promise<UserRoleEntity[]> {
    const userRoles = roles.map((role) =>
      this.repository.create({
        userId,
        role,
        createdBy,
      }),
    );

    return this.repository.save(userRoles);
  }

  async deleteUserRoles(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async updateUserRoles(
    userId: string,
    roles: string[],
    createdBy: string,
  ): Promise<UserRoleEntity[]> {
    // Delete existing roles
    await this.deleteUserRoles(userId);

    // Create new roles
    return this.createUserRoles(userId, roles, createdBy);
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, role },
    });
    return count > 0;
  }

  async hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
    const userRoles = await this.findByUserId(userId);
    const userRoleNames = userRoles.map((ur) => ur.role);
    return roles.some((role) => userRoleNames.includes(role));
  }

  /**
   * Create user role assignment (IAM-based with role_id)
   */
  async create(data: {
    userId: string;
    roleId: string;
    organizationId?: string | null;
  }): Promise<UserRoleEntity> {
    const userRole = this.repository.create({
      userId: data.userId,
      roleId: data.roleId,
      organizationId: data.organizationId || null,
    });
    return this.repository.save(userRole);
  }

  /**
   * Find by user and role ID
   */
  async findByUserAndRole(userId: string, roleId: string): Promise<UserRoleEntity | null> {
    return this.repository.findOne({
      where: { userId, roleId },
    });
  }

  /**
   * Check if user has platform admin role (organization_id = NULL)
   */
  async hasPlatformAdminRole(userId: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('user_role')
      .innerJoin('roles', 'role', 'role.id = user_role.role_id')
      .where('user_role.user_id = :userId', { userId })
      .andWhere('role.code = :code', { code: 'platform_admin' })
      .andWhere('user_role.organization_id IS NULL')
      .getCount();

    return count > 0;
  }
}
