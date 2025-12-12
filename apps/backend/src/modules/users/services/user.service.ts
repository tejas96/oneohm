import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@oneohm-epc/shared-types';

import { ProfileService } from './profile.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../entities/user.entity';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserRepository } from '../repositories/user.repository';

/**
 * User Service
 * Handles core user authentication operations
 * Profile-specific operations handled by ProfileService
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    @Inject(forwardRef(() => ProfileService))
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Create a new user with optional profile creation
   *
   * @param createDto - User data with optional profile info
   * @param createdBy - UUID of the user creating this user (for audit)
   * @returns Created user entity
   *
   * @example
   * // Create user only
   * await userService.create({ firstName: 'John', phone: '+919876543210' });
   *
   * @example
   * // Create user + employee profile (org onboarding)
   * await userService.create({
   *   firstName: 'John',
   *   phone: '+919876543210',
   *   organizationId: 'org-uuid',
   *   profileType: UserProfileType.EMPLOYEE,
   *   profileData: { employeeId: 'EMP001', designation: 'Sales Executive' }
   * }, 'admin-user-uuid');
   */
  async create(createDto: CreateUserDto, createdBy?: string): Promise<UserEntity> {
    // Validate: If profileType provided, organizationId is required
    if (createDto.profileType && !createDto.organizationId) {
      throw new BadRequestException('organizationId is required when profileType is provided');
    }

    // Check if email already exists (if provided)
    if (createDto.email) {
      const existingEmail = await this.userRepository.findByEmail(createDto.email);
      if (existingEmail) {
        throw new ConflictException(`Email ${createDto.email} is already registered`);
      }
    }

    // Check if phone already exists
    const existingPhone = await this.userRepository.findByPhone(createDto.phone);
    if (existingPhone) {
      throw new ConflictException(`Phone ${createDto.phone} is already registered`);
    }

    // Extract profile and role fields from user data
    const { roles, password, organizationId, profileType, profileData, ...userData } = createDto;

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      passwordHash: password, // Will be hashed by entity hook
      status: createDto.status || UserStatus.ACTIVE,
      profileCompleted: false, // Will be updated after profile creation
    });

    this.logger.log(`User created: ${user.phone} (${user.email || 'no email'})`);

    // Create profile if profileType is provided (org onboarding flow)
    if (profileType && organizationId) {
      try {
        // Use first role from roles array if provided, otherwise use default for profileType
        const customRoleCode = roles && roles.length > 0 ? roles[0] : undefined;

        await this.profileService.createProfile({
          userId: user.id,
          organizationId,
          profileType,
          profileData: profileData || {},
          createdBy: createdBy || user.id,
          roleCode: customRoleCode, // Pass custom role if provided
        });

        this.logger.log(
          `Profile created: ${profileType} for user ${user.id} in org ${organizationId}${ 
            customRoleCode ? ` with role ${customRoleCode}` : ''}`,
        );
      } catch (error) {
        // Log error but don't fail user creation
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to create ${profileType} profile for user ${user.id}: ${errorMessage}`,
        );
        // Re-throw for now - we want the caller to know profile creation failed
        throw error;
      }
    } else if (roles && roles.length > 0) {
      // Legacy: Direct role assignment (deprecated, use profileType instead)
      await this.userRoleRepository.createUserRoles(
        user.id,
        roles,
        createdBy || user.id,
        organizationId,
      );
      this.logger.warn(
        `Direct role assignment used for user ${user.id}. Consider using profileType instead.`,
      );
    }

    // Return user with roles
    return this.findById(user.id);
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: UserStatus,
  ): Promise<{ items: UserEntity[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.userRepository.findAll(page, limit, status);

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

  async findByPhone(phone: string): Promise<UserEntity> {
    const user = await this.userRepository.findByPhoneWithRoles(phone);

    if (!user) {
      throw new NotFoundException(`User with phone ${phone} not found`);
    }

    return user;
  }

  async update(id: string, updateDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    // If phone is being updated, check for conflicts
    if (updateDto.phone && updateDto.phone !== user.phone) {
      const existingPhone = await this.userRepository.findByPhone(updateDto.phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException(`Phone ${updateDto.phone} is already in use`);
      }
    }

    // Extract roles from DTO
    const { roles, ...userData } = updateDto;

    // Update user
    const updatedUser = await this.userRepository.update(id, userData);

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update roles if provided
    if (roles) {
      await this.userRoleRepository.updateUserRoles(id, roles, id);
    }

    this.logger.log(`User updated: ${updatedUser.phone}`);

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);

    const success = await this.userRepository.softDelete(id);

    if (!success) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`User deleted: ${user.phone}`);
  }

  /**
   * Update user status (Generic method)
   * @param id - User UUID
   * @param newStatus - New status to set
   * @returns Updated user
   */
  async updateStatus(id: string, newStatus: UserStatus): Promise<UserEntity> {
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
    }
    // Note: No special handling needed for ACTIVE status

    const updatedUser = await this.userRepository.update(id, {
      status: newStatus,
    });

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.log(`User status updated: ${updatedUser.phone} -> ${newStatus}`);

    return this.findById(id);
  }

  /**
   * Mark user profile as completed
   * Called after user completes profile setup
   */
  async markProfileCompleted(userId: string): Promise<void> {
    await this.userRepository.markProfileCompleted(userId);
    this.logger.log(`User profile marked as completed: ${userId}`);
  }
}
