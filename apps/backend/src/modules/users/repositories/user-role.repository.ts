import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

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

  async findByUserIds(userIds: string[]): Promise<UserRoleEntity[]> {
    if (userIds.length === 0) return [];
    return this.repository.find({
      where: { userId: In(userIds) },
    });
  }

  /**
   * Create user roles (legacy string-based roles)
   * @param userId - User ID
   * @param roles - Array of role codes (e.g., ['customer', 'reseller'])
   * @param createdBy - User who created the assignment
   */
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

  /**
   * Update user roles (replaces existing roles)
   * @param userId - User ID
   * @param roles - Array of role codes
   * @param createdBy - User who updated the assignment
   */
  async updateUserRoles(
    userId: string,
    roles: string[],
    createdBy: string,
  ): Promise<UserRoleEntity[]> {
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
   * Find roles for user in a specific organization.
   * Also includes platform-level roles (organization_id IS NULL) since
   * those apply globally across all organizations.
   */
  async findByUserAndOrganization(
    userId: string,
  ): Promise<UserRoleEntity[]> {
    return this.repository.find({
      where: [
        { userId },
        { userId },
      ],
    });
  }

  /**
   * Check if user has a specific role in an organization
   */
  async hasRoleInOrganization(
    userId: string,
    role: string,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, role },
    });
    return count > 0;
  }

  /**
   * Delete roles for user in a specific organization
   */
  async deleteUserRolesInOrganization(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  /**
   * Create user role assignment (IAM-based with role_id)
   */
  async create(data: {
    userId: string;
    roleId: string;
    role?: string | null;
    createdBy?: string;
  }): Promise<UserRoleEntity> {
    const userRole = this.repository.create({
      userId: data.userId,
      roleId: data.roleId,
      role: data.role ?? null,
      createdBy: data.createdBy,
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
      .getCount();

    return count > 0;
  }

  /**
   * Find user roles with role details (for API responses)
   * Includes role code, name from the IAM roles table
   */
  async findByUserIdWithRoles(userId: string): Promise<UserRoleEntity[]> {
    return this.repository.find({
      where: { userId },
      relations: ['iamRole', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find all users with a specific role
   * @param roleId - The IAM role ID
   * @returns Array of user role assignments with user details
   */
  async findByRoleId(roleId: string): Promise<UserRoleEntity[]> {
    return this.repository.find({
      where: { roleId },
      relations: ['user', 'iamRole'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete a user role assignment by ID
   * @param id - The user_roles.id
   */
  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /**
   * Find a user role by ID with relations
   */
  async findById(id: string): Promise<UserRoleEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'iamRole'],
    });
  }

  /**
   * Count how many users are assigned to a given role
   */
  async countByRoleId(roleId: string): Promise<number> {
    return this.repository.count({ where: { roleId } });
  }
}
