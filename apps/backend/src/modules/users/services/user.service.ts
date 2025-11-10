import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@oneohm-epc/shared-types';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../entities/user.entity';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async create(createDto: CreateUserDto, createdBy: string): Promise<UserEntity> {
    // Check if email already exists
    const existingEmail = await this.userRepository.findByEmail(createDto.email);
    if (existingEmail) {
      throw new ConflictException(`Email ${createDto.email} is already registered`);
    }

    // Check if phone already exists
    const existingPhone = await this.userRepository.findByPhone(createDto.phone);
    if (existingPhone) {
      throw new ConflictException(`Phone ${createDto.phone} is already registered`);
    }

    // Extract roles from DTO
    const { roles, password, dateOfBirth, joiningDate, ...userData } = createDto;

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      passwordHash: password, // Will be hashed by entity hook
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      createdBy,
      updatedBy: createdBy,
      status: createDto.status || UserStatus.ACTIVE,
    });

    // Create user roles
    await this.userRoleRepository.createUserRoles(user.id, roles, createdBy);

    this.logger.log(`User created: ${user.email}`);

    // Return user with roles
    return this.findById(user.id);
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    status?: UserStatus,
  ): Promise<{ items: UserEntity[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.userRepository.findAll(organizationId, page, limit, status);

    // Fetch roles for each user
    const itemsWithRoles = await Promise.all(
      items.map(async (user) => {
        const userRoles = await this.userRoleRepository.findByUserId(user.id);
        user.roles = userRoles.map((ur) => ur.role);
        return user;
      }),
    );

    return {
      items: itemsWithRoles,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findByIdWithRoles(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserEntity> {
    const user = await this.userRepository.findByEmailWithRoles(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async update(id: string, updateDto: UpdateUserDto, updatedBy: string): Promise<UserEntity> {
    const user = await this.findById(id);

    // If phone is being updated, check for conflicts
    if (updateDto.phone && updateDto.phone !== user.phone) {
      const existingPhone = await this.userRepository.findByPhone(updateDto.phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException(`Phone ${updateDto.phone} is already in use`);
      }
    }

    // Extract roles from DTO
    const { roles, dateOfBirth, joiningDate, ...userData } = updateDto;

    // Update user
    const updatedUser = await this.userRepository.update(id, {
      ...userData,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      updatedBy,
    });

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update roles if provided
    if (roles && roles.length > 0) {
      await this.userRoleRepository.updateUserRoles(id, roles, updatedBy);
    }

    this.logger.log(`User updated: ${updatedUser.email}`);

    return this.findById(id);
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    const user = await this.findById(id);

    const success = await this.userRepository.softDelete(id, deletedBy);

    if (!success) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`User deleted: ${user.email}`);
  }

  /**
   * Update user status (Generic method)
   * @param id - User UUID
   * @param newStatus - New status to set
   * @param updatedBy - User ID performing the action
   * @returns Updated user
   */
  async updateStatus(id: string, newStatus: UserStatus, updatedBy: string): Promise<UserEntity> {
    const user = await this.findById(id);

    // Validate status transition
    if (user.status === newStatus) {
      throw new BadRequestException(`User is already in '${newStatus}' status`);
    }

    // Business rules based on status transition
    if (newStatus === UserStatus.SUSPENDED) {
      // TODO: Add suspension rules
      // - Revoke active sessions
      // - Notify user via email
      // - Log security event
    } else if (newStatus === UserStatus.INACTIVE) {
      // TODO: Add deactivation rules
      // - Complete pending tasks
      // - Transfer ownership
      // - Archive user data
    } else if (newStatus === UserStatus.ACTIVE) {
      // TODO: Add activation rules
      // - Verify account requirements
      // - Send welcome back notification
    }

    const updatedUser = await this.userRepository.update(id, {
      status: newStatus,
      updatedBy,
    });

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`User status updated: ${updatedUser.email} -> ${newStatus}`);

    return this.findById(id);
  }
}
