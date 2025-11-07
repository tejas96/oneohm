import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Role } from '@oneohm-epc/shared-auth';
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
    roles: Role[],
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
    roles: Role[],
    createdBy: string,
  ): Promise<UserRoleEntity[]> {
    // Delete existing roles
    await this.deleteUserRoles(userId);

    // Create new roles
    return this.createUserRoles(userId, roles, createdBy);
  }

  async hasRole(userId: string, role: Role): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, role },
    });
    return count > 0;
  }

  async hasAnyRole(userId: string, roles: Role[]): Promise<boolean> {
    const userRoles = await this.findByUserId(userId);
    const userRoleNames = userRoles.map((ur) => ur.role);
    return roles.some((role) => userRoleNames.includes(role));
  }
}
