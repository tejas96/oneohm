import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus } from '@oneohm-epc/shared/types';

import { ProfileService } from './profile.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../entities/user.entity';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserRepository, type UserListFilters } from '../repositories/user.repository';

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

    // Check if email already exists (including soft-deleted users to avoid DB 23505)
    if (createDto.email) {
      const existingEmail = await this.userRepository.findByEmailIncludingDeleted(createDto.email);
      if (existingEmail) {
        if (existingEmail.deletedAt) {
          throw new ConflictException(
            `Email ${createDto.email} belongs to a previously deleted account. Please restore that account instead.`,
          );
        }
        throw new ConflictException(`Email ${createDto.email} is already registered`);
      }
    }

    // Check if phone already exists (including soft-deleted users to avoid DB 23505)
    const existingPhone = await this.userRepository.findByPhoneIncludingDeleted(createDto.phone);
    if (existingPhone) {
      if (existingPhone.deletedAt) {
        throw new ConflictException(
          `Phone ${createDto.phone} belongs to a previously deleted account. Please restore that account instead.`,
        );
      }
      throw new ConflictException(`Phone ${createDto.phone} is already registered`);
    }

    // Extract profile and role fields from user data
    const { roles, password, organizationId, profileType, profileData, ...userData } = createDto;

    // Create user
    let user: UserEntity;
    try {
      user = await this.userRepository.create({
        ...userData,
        passwordHash: password, // Will be hashed by entity hook
        status: createDto.status || UserStatus.ACTIVE,
        profileCompleted: false, // Will be updated after profile creation
      });
    } catch (dbErr: unknown) {
      const e = dbErr as { code?: string; constraint?: string; message?: string };
      if (e.code === '23505') {
        const msg = e.constraint?.includes('email')
          ? `Email ${createDto.email ?? ''} is already in use`
          : `Phone ${createDto.phone} is already in use`;
        throw new ConflictException(msg);
      }
      throw dbErr;
    }

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
          profileData: (profileData || {}) as Record<string, unknown>,
          createdBy: createdBy || user.id,
          roleCode: customRoleCode, // Pass custom role if provided
        });

        this.logger.log(
          `Profile created: ${profileType} for user ${user.id} in org ${organizationId}${
            customRoleCode ? ` with role ${customRoleCode}` : ''
          }`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to create ${profileType} profile for user ${user.id}: ${errorMessage}`,
        );

        // Clean up the orphaned user since profile creation failed
        try {
          await this.userRepository.repository.delete(user.id);
          this.logger.log(`Cleaned up orphaned user ${user.id} after profile creation failure`);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup orphaned user ${user.id}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          );
        }

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
    filters?: UserListFilters,
  ): Promise<{ items: UserEntity[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.userRepository.findAll(page, limit, filters);

    return {
      items,
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

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const user = await this.userRepository.findByEmailIncludingDeleted(email, excludeId);
    return !!user;
  }

  async phoneExists(phone: string, excludeId?: string): Promise<boolean> {
    const user = await this.userRepository.findByPhoneIncludingDeleted(phone, excludeId);
    return !!user;
  }

  async update(id: string, updateDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    // If email is being updated, check for conflicts
    if (updateDto.email && updateDto.email !== user.email) {
      const existingEmail = await this.userRepository.findByEmailIncludingDeleted(
        updateDto.email,
        id,
      );
      if (existingEmail) {
        if (existingEmail.deletedAt) {
          throw new ConflictException(
            `Email ${updateDto.email} belongs to a previously deleted account. Please restore that account instead.`,
          );
        }
        throw new ConflictException(`Email ${updateDto.email} is already in use`);
      }
    }

    // If phone is being updated, check for conflicts (include soft-deleted to prevent phone theft from deleted accounts)
    if (updateDto.phone && updateDto.phone !== user.phone) {
      const existingPhone = await this.userRepository.findByPhoneIncludingDeleted(
        updateDto.phone,
        id,
      );
      if (existingPhone) {
        if (existingPhone.deletedAt) {
          throw new ConflictException(
            `Phone ${updateDto.phone} belongs to a previously deleted account. Please restore that account instead.`,
          );
        }
        throw new ConflictException(`Phone ${updateDto.phone} is already in use`);
      }
    }

    // Strip fields that don't belong on UserEntity
    const { roles, ...rest } = updateDto as UpdateUserDto & {
      profileData?: unknown;
      profileType?: unknown;
      organizationId?: unknown;
    };
    const { profileData, profileType, organizationId, ...userData } = rest;
    void profileData;
    void profileType;
    void organizationId;

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

    // Second findById is intentional: re-fetches with role JOIN to return a consistent UserEntity.
    // Acceptable trade-off for correctness; optimise to a single query if update volume grows.
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    const manager = this.userRepository.repository.manager;

    const activeTaskCount = await manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('project_tasks', 'pt')
      .innerJoin('projects', 'p', 'p.id = pt.project_id AND p.deleted_at IS NULL')
      .where('pt.assigned_to_user_id = :userId', { userId: id })
      .andWhere('pt.deleted_at IS NULL')
      .andWhere("pt.status NOT IN ('done', 'cancelled')")
      .getRawOne<{ count: string }>();

    const pendingTasks = parseInt(activeTaskCount?.count ?? '0', 10);
    if (pendingTasks > 0) {
      throw new BadRequestException(
        `Cannot delete user: ${pendingTasks} active task(s) are still assigned. Please reassign or complete them first.`,
      );
    }

    await manager.transaction(async (tx) => {
      const result = await tx
        .createQueryBuilder()
        .update('users')
        .set({ deletedAt: new Date(), status: UserStatus.ARCHIVED })
        .where('id = :id AND deleted_at IS NULL', { id })
        .execute();

      if ((result.affected ?? 0) === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await tx
        .createQueryBuilder()
        .update('employee_profiles')
        .set({ deletedAt: new Date() })
        .where('user_id = :userId AND deleted_at IS NULL', { userId: id })
        .execute();
    });

    this.logger.log(`User deleted: ${user.phone}`);
  }

  async restore(id: string): Promise<UserEntity> {
    const manager = this.userRepository.repository.manager;

    await manager.transaction(async (tx) => {
      const result = await tx
        .createQueryBuilder()
        .update('users')
        .set({ deletedAt: null as unknown as Date, status: UserStatus.ACTIVE })
        .where('id = :id AND deleted_at IS NOT NULL', { id })
        .execute();

      if ((result.affected ?? 0) === 0) {
        throw new NotFoundException(`User with ID ${id} not found or not deleted`);
      }

      await tx
        .createQueryBuilder()
        .update('employee_profiles')
        .set({ deletedAt: null as unknown as Date })
        .where('user_id = :userId', { userId: id })
        .execute();
    });

    this.logger.log(`User restored: ${id}`);
    return this.findById(id);
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

    // When deactivating or suspending, warn about active tasks
    if (newStatus === UserStatus.INACTIVE || newStatus === UserStatus.SUSPENDED) {
      const activeTaskCount = await this.userRepository.repository.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('project_tasks', 'pt')
        .innerJoin('projects', 'p', 'p.id = pt.project_id AND p.deleted_at IS NULL')
        .where('pt.assigned_to_user_id = :userId', { userId: id })
        .andWhere('pt.deleted_at IS NULL')
        .andWhere("pt.status NOT IN ('done', 'cancelled')")
        .getRawOne<{ count: string }>();

      const pendingTasks = parseInt(activeTaskCount?.count ?? '0', 10);
      if (pendingTasks > 0) {
        this.logger.warn(
          `User ${id} has ${pendingTasks} active tasks while being set to ${newStatus}`,
        );
      }
    }

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
