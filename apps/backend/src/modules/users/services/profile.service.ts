import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UserProfileType } from '@oneohm-epc/shared-types';

import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { CustomerProfileRepository } from '../../customers/repositories/customer-profile.repository';
import { EmployeeProfileEntity } from '../../employees/entities/employee-profile.entity';
import { EmployeeProfileRepository } from '../../employees/repositories/employee-profile.repository';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { ResellerProfileEntity } from '../../resellers/entities/reseller-profile.entity';
import { ResellerProfileRepository } from '../../resellers/repositories/reseller-profile.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { UserRepository } from '../repositories/user.repository';

interface CreateProfileDto {
  userId: string;
  organizationId: string;
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
    organizationId: string;
    organizationName?: string;
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
    private readonly resellerProfileRepository: ResellerProfileRepository,
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

    // Fetch all profile types
    const [customerProfiles, resellerProfiles, employeeProfiles] = await Promise.all([
      this.customerProfileRepository.findByUserId(userId),
      this.resellerProfileRepository.findByUserId(userId),
      this.employeeProfileRepository.findByUserId(userId),
    ]);

    const profiles: UserProfileSummary['profiles'] = [
      ...customerProfiles.map((p) => ({
        type: UserProfileType.CUSTOMER,
        organizationId: p.organizationId,
        organizationName: p.organization?.name,
        profileId: p.id,
      })),
      ...resellerProfiles.map((p) => ({
        type: UserProfileType.RESELLER,
        organizationId: p.organizationId,
        organizationName: p.organization?.name,
        profileId: p.id,
      })),
      ...employeeProfiles.map((p) => ({
        type: UserProfileType.EMPLOYEE,
        organizationId: p.organizationId,
        organizationName: p.organization?.name,
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
  ): Promise<CustomerProfileEntity | ResellerProfileEntity | EmployeeProfileEntity> {
    const { userId, organizationId, profileType, profileData, createdBy, roleCode } = dto;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if profile already exists
    const existingProfile = await this.getProfile(userId, organizationId, profileType);
    if (existingProfile) {
      throw new BadRequestException(
        `User already has a ${profileType} profile in this organization`,
      );
    }

    let profile: CustomerProfileEntity | ResellerProfileEntity | EmployeeProfileEntity;
    let defaultRoleCode: string;

    try {
      switch (profileType) {
        case UserProfileType.CUSTOMER:
          profile = await this.customerProfileRepository.create({
            userId,
            organizationId,
            ...profileData,
            createdBy,
          });
          defaultRoleCode = 'customer';
          this.logger.log(`Created customer profile for user ${userId} in org ${organizationId}`);
          break;

        case UserProfileType.RESELLER:
          profile = await this.resellerProfileRepository.create({
            userId,
            organizationId,
            ...profileData,
            createdBy,
          });
          defaultRoleCode = 'reseller';
          this.logger.log(`Created reseller profile for user ${userId} in org ${organizationId}`);
          break;

        case UserProfileType.EMPLOYEE:
          profile = await this.employeeProfileRepository.create({
            userId,
            organizationId,
            ...profileData,
            createdBy,
          });
          defaultRoleCode = 'employee_basic';
          this.logger.log(`Created employee profile for user ${userId} in org ${organizationId}`);
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
          throw new ConflictException(
            `Employee ID "${pd.employeeId ?? ''}" already exists in this organization`,
          );
        }
        if (constraint.includes('company_code')) {
          const pd = profileData as Record<string, string | undefined>;
          throw new ConflictException(
            `Company code "${pd.companyCode ?? ''}" already exists in this organization`,
          );
        }
        throw new ConflictException(
          `A ${profileType} profile with this data already exists in the organization`,
        );
      }
      throw error;
    }

    // ✅ AUTO-ASSIGN ROLE (use custom roleCode if provided, otherwise use default)
    const finalRoleCode = roleCode || defaultRoleCode;
    await this.assignDefaultRole(userId, organizationId, finalRoleCode, createdBy);

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
    organizationId: string,
    profileType: UserProfileType,
  ): Promise<CustomerProfileEntity | ResellerProfileEntity | EmployeeProfileEntity | null> {
    switch (profileType) {
      case UserProfileType.CUSTOMER:
        return this.customerProfileRepository.findByUserAndOrganization(userId, organizationId);

      case UserProfileType.RESELLER:
        return this.resellerProfileRepository.findByUserAndOrganization(userId, organizationId);

      case UserProfileType.EMPLOYEE:
        return this.employeeProfileRepository.findByUserAndOrganization(userId, organizationId);

      default:
        throw new BadRequestException(`Invalid profile type: ${String(profileType)}`);
    }
  }

  /**
   * Update basic user info (name, email)
   */
  async updateUserBasicInfo(
    userId: string,
    updates: { firstName?: string; lastName?: string; email?: string },
  ): Promise<void> {
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
  async hasProfile(
    userId: string,
    organizationId: string,
    profileType: UserProfileType,
  ): Promise<boolean> {
    const profile = await this.getProfile(userId, organizationId, profileType);
    return !!profile;
  }

  /**
   * Get all profiles of a specific type for a user
   */
  async getUserProfilesByType(
    userId: string,
    profileType: UserProfileType,
  ): Promise<Array<CustomerProfileEntity | ResellerProfileEntity | EmployeeProfileEntity>> {
    switch (profileType) {
      case UserProfileType.CUSTOMER:
        return this.customerProfileRepository.findByUserId(userId);

      case UserProfileType.RESELLER:
        return this.resellerProfileRepository.findByUserId(userId);

      case UserProfileType.EMPLOYEE:
        return this.employeeProfileRepository.findByUserId(userId);

      default:
        throw new BadRequestException(`Invalid profile type: ${String(profileType)}`);
    }
  }

  /**
   * Verify user has access to an organization
   * Throws ForbiddenException if user doesn't have any profile in the organization
   * @param userId - User ID
   * @param organizationId - Organization ID to check access
   * @param requiredProfileType - Optional: require specific profile type
   */
  async verifyUserHasAccessToOrg(
    userId: string,
    organizationId: string,
    requiredProfileType?: UserProfileType,
  ): Promise<void> {
    const profileSummary = await this.getUserProfileSummary(userId);

    const hasAccess = profileSummary.profiles.some(
      (p) =>
        p.organizationId === organizationId &&
        (requiredProfileType ? p.type === requiredProfileType : true),
    );

    if (!hasAccess) {
      const profileTypeMsg = requiredProfileType ? ` with ${requiredProfileType} profile` : '';
      throw new NotFoundException(
        `User does not have access to organization ${organizationId}${profileTypeMsg}`,
      );
    }

    this.logger.debug(`Access verified: User ${userId} has access to org ${organizationId}`);
  }

  /**
   * Get all organizations a user has access to
   * Returns unique organization IDs across all profile types
   */
  async getUserOrganizations(userId: string): Promise<string[]> {
    const profileSummary = await this.getUserProfileSummary(userId);
    const uniqueOrgIds = [...new Set(profileSummary.profiles.map((p) => p.organizationId))];
    return uniqueOrgIds;
  }

  /**
   * Assign default role to user based on profile type
   * Called automatically after profile creation
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param roleCode - Role code to assign (e.g., 'customer', 'reseller', 'employee_basic')
   * @param createdBy - User ID of creator (for audit)
   */
  private async assignDefaultRole(
    userId: string,
    organizationId: string,
    roleCode: string,
    createdBy?: string,
  ): Promise<void> {
    try {
      const role = await this.roleRepository.findByCodeAndOrganization(roleCode, organizationId);

      if (!role) {
        this.logger.error(
          `Default role '${roleCode}' not found for org ${organizationId}. ` +
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
        organizationId,
        createdBy: createdBy || userId,
      });

      this.logger.log(
        `Assigned default role '${roleCode}' (${role.id}) to user ${userId} in org ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to assign default role '${roleCode}' to user ${userId}:`, error);
    }
  }
}
