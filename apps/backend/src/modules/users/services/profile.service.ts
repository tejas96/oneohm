import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EmployeeProfileKind, UserProfileType } from '@tejas96/shared/types';

import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { CustomerProfileRepository } from '../../customers/repositories/customer-profile.repository';
import { EmployeeProfileEntity } from '../../employees/entities/employee-profile.entity';
import { EmployeeProfileRepository } from '../../employees/repositories/employee-profile.repository';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserRepository } from '../repositories/user.repository';

interface CreateProfileDto {
  userId: string;
  profileType: UserProfileType;

  profileData: Record<string, unknown>;
  createdBy?: string;
  roleCode?: string;
}

interface UserProfileSummary {
  userId: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName?: string;
  profileCompleted: boolean;
  profiles: {
    type: UserProfileType;
    profileId: string;
  }[];
}

/**
 * Profile Management Service
 * Handles multi-profile operations for users across organizations
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly employeeProfileRepository: EmployeeProfileRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Get complete user profile summary across all organizations
   */
  async getUserProfileSummary(userId: string): Promise<UserProfileSummary> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch all profile types. employee_profiles now holds both staff and
    // reseller-kind rows (distinguished by profileKind), so a single fetch
    // is partitioned client-side rather than issuing a second query.
    const [customerProfiles, allEmployeeProfiles] = await Promise.all([
      this.customerProfileRepository.findByUserId(userId),
      this.employeeProfileRepository.findByUserId(userId),
    ]);

    const resellerProfiles = allEmployeeProfiles.filter(
      (p) => p.profileKind === EmployeeProfileKind.RESELLER,
    );
    const employeeProfiles = allEmployeeProfiles.filter(
      (p) => p.profileKind === EmployeeProfileKind.STAFF,
    );

    const profiles: UserProfileSummary['profiles'] = [
      ...customerProfiles.map((p) => ({
        type: UserProfileType.CUSTOMER,
        profileId: p.id,
      })),
      ...resellerProfiles.map((p) => ({
        type: UserProfileType.RESELLER,
        profileId: p.id,
      })),
      ...employeeProfiles.map((p) => ({
        type: UserProfileType.EMPLOYEE,
        profileId: p.id,
      })),
    ];

    return {
      userId: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileCompleted: user.profileCompleted,
      profiles,
    };
  }

  /**
   * Create a new profile for a user in an organization
   * Automatically assigns role based on profile type (or custom role if provided)
   */
  async createProfile(
    dto: CreateProfileDto,
  ): Promise<CustomerProfileEntity | EmployeeProfileEntity> {
    const { userId, profileType, profileData, createdBy, roleCode } = dto;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if profile already exists
    const existingProfile = await this.getProfile(userId, profileType);
    if (existingProfile) {
      throw new BadRequestException(`User already has a ${profileType} profile`);
    }

    let profile: CustomerProfileEntity | EmployeeProfileEntity;
    let defaultRoleCode: string;

    try {
      switch (profileType) {
        case UserProfileType.CUSTOMER:
          profile = await this.customerProfileRepository.create({
            userId,
            ...profileData,
            createdBy,
          });
          defaultRoleCode = 'customer';
          this.logger.log(`Created customer profile for user ${userId}`);
          break;

        case UserProfileType.RESELLER:
          profile = await this.employeeProfileRepository.create({
            userId,
            ...profileData,
            profileKind: EmployeeProfileKind.RESELLER,
            createdBy,
          });
          defaultRoleCode = 'reseller';
          this.logger.log(`Created reseller profile for user ${userId}`);
          break;

        case UserProfileType.EMPLOYEE:
          profile = await this.employeeProfileRepository.create({
            userId,
            ...profileData,
            profileKind: EmployeeProfileKind.STAFF,
            createdBy,
          });
          defaultRoleCode = 'employee_basic';
          this.logger.log(`Created employee profile for user ${userId}`);
          break;

        default:
          throw new BadRequestException(`Invalid profile type: ${String(profileType)}`);
      }
    } catch (error: unknown) {
      const dbError = error as { code?: string; constraint?: string };
      if (dbError.code === '23505') {
        const constraint = dbError.constraint ?? '';
        if (constraint.includes('emp_id') || constraint.includes('employee_id')) {
          const pd = profileData as Record<string, string | undefined>;
          throw new ConflictException(`Employee ID "${pd.employeeId ?? ''}" already exists`);
        }
        if (constraint.includes('company_code')) {
          const pd = profileData as Record<string, string | undefined>;
          throw new ConflictException(`Company code "${pd.companyCode ?? ''}" already exists`);
        }
        throw new ConflictException(`A ${profileType} profile with this data already exists`);
      }
      throw error;
    }

    // ✅ AUTO-ASSIGN ROLE (use custom roleCode if provided, otherwise use default)
    const finalRoleCode = roleCode || defaultRoleCode;
    await this.assignDefaultRole(userId, finalRoleCode, createdBy);

    // ✅ UPDATE USER: Mark profile as completed
    await this.userRepository.markProfileCompleted(userId);
    this.logger.log(`✅ Profile completed for user ${userId}`);

    return profile;
  }

  /**
   * Get a specific profile for a user in an organization
   */
  async getProfile(
    userId: string,
    profileType: UserProfileType,
  ): Promise<CustomerProfileEntity | EmployeeProfileEntity | null> {
    switch (profileType) {
      case UserProfileType.CUSTOMER:
        return this.customerProfileRepository.findByUserAndOrganization(userId);

      case UserProfileType.RESELLER: {
        // employee_profiles now holds both staff and reseller-kind rows; a
        // user can only have one row per (userId), so filter
        // by profileKind to avoid returning a staff row as a "reseller" profile.
        const profile = await this.employeeProfileRepository.findByUserAndOrganization(userId);
        return profile?.profileKind === EmployeeProfileKind.RESELLER ? profile : null;
      }

      case UserProfileType.EMPLOYEE: {
        const profile = await this.employeeProfileRepository.findByUserAndOrganization(userId);
        return profile?.profileKind === EmployeeProfileKind.STAFF ? profile : null;
      }

      default:
        throw new BadRequestException(`Invalid profile type: ${String(profileType)}`);
    }
  }

  /**
   * Update basic user info (name, email, phone).
   *
   * Keeps the core `users` record (login identity) in sync whenever a profile
   * (customer/reseller/employee) changes its contact details. Without this,
   * `users.phone`/`users.email` go stale and future lookups by the new contact
   * info (duplicate checks, login, search) silently miss the user, while
   * lookups by the old contact info incorrectly resolve back to this profile.
   */
  async updateUserBasicInfo(
    userId: string,
    updates: { firstName?: string; lastName?: string; email?: string; phone?: string },
  ): Promise<void> {
    if (updates.phone) {
      const existingByPhone = await this.userRepository.findByPhoneIncludingDeleted(
        updates.phone,
        userId,
      );
      if (existingByPhone) {
        throw new ConflictException(
          `Phone '${updates.phone}' is already registered to another user`,
        );
      }
    }

    if (updates.email) {
      const existingByEmail = await this.userRepository.findByEmailIncludingDeleted(
        updates.email,
        userId,
      );
      if (existingByEmail) {
        throw new ConflictException(
          `Email '${updates.email}' is already registered to another user`,
        );
      }
    }

    await this.userRepository.update(userId, updates);
    this.logger.log(`Updated basic info for user ${userId}`);
  }

  /**
   * Mark user profile as completed
   */
  async completeProfile(userId: string): Promise<void> {
    await this.userRepository.markProfileCompleted(userId);
    this.logger.log(`Marked profile as completed for user ${userId}`);
  }

  /**
   * Check if user has a specific profile type in an organization
   */
  async hasProfile(userId: string, profileType: UserProfileType): Promise<boolean> {
    const profile = await this.getProfile(userId, profileType);
    return !!profile;
  }

  /**
   * Get all profiles of a specific type for a user
   */
  async getUserProfilesByType(
    userId: string,
    profileType: UserProfileType,
  ): Promise<Array<CustomerProfileEntity | EmployeeProfileEntity>> {
    switch (profileType) {
      case UserProfileType.CUSTOMER:
        return this.customerProfileRepository.findByUserId(userId);

      case UserProfileType.RESELLER: {
        const profiles = await this.employeeProfileRepository.findByUserId(userId);
        return profiles.filter((p) => p.profileKind === EmployeeProfileKind.RESELLER);
      }

      case UserProfileType.EMPLOYEE: {
        const profiles = await this.employeeProfileRepository.findByUserId(userId);
        return profiles.filter((p) => p.profileKind === EmployeeProfileKind.STAFF);
      }

      default:
        throw new BadRequestException(`Invalid profile type: ${String(profileType)}`);
    }
  }

  /**
   * Verify user has access to an organization
   * Throws ForbiddenException if user doesn't have any profile
   * @param userId - User ID
   * @param requiredProfileType - Optional: require specific profile type
   */
  async verifyUserHasAccessToOrg(
    userId: string,
    requiredProfileType?: UserProfileType,
  ): Promise<void> {
    const profileSummary = await this.getUserProfileSummary(userId);

    const hasAccess = profileSummary.profiles.some((p) =>
      requiredProfileType ? p.type === requiredProfileType : true,
    );

    if (!hasAccess) {
      const profileTypeMsg = requiredProfileType ? ` with ${requiredProfileType} profile` : '';
      throw new NotFoundException(`User does not have access to organization ${profileTypeMsg}`);
    }

    this.logger.debug(`Access verified: User ${userId} has access to org `);
  }

  /**
   * Assign default role to user based on profile type
   * Called automatically after profile creation
   * @param userId - User ID
   * @param roleCode - Role code to assign (e.g., 'customer', 'reseller', 'employee_basic')
   * @param createdBy - User ID of creator (for audit)
   */
  async assignDefaultRole(userId: string, roleCode: string, createdBy?: string): Promise<void> {
    try {
      const role = await this.roleRepository.findByCodeAndOrganization(roleCode);

      if (!role) {
        this.logger.error(
          `Default role '${roleCode}' not found. ` +
            `Ensure the SeedIAMCoreData migration has run. ` +
            `User ${userId} will have no role until assigned manually.`,
        );
        return;
      }

      const existingRoles = await this.userRoleRepository.findByUserId(userId);
      const hasRole = existingRoles.some((ur) => ur.roleId === role.id);

      if (hasRole) {
        this.logger.debug(`User ${userId} already has role '${roleCode}' (${role.id})`);
        return;
      }

      await this.userRoleRepository.create({
        userId,
        roleId: role.id,
        role: roleCode,
        createdBy: createdBy || userId,
      });

      this.logger.log(`Assigned default role '${roleCode}' (${role.id}) to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to assign default role '${roleCode}' to user ${userId}:`, error);
    }
  }
}
