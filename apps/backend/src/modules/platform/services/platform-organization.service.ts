import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { RoleRepository } from '../../iam/repositories/role.repository';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { InvitationService } from '../../users/services/invitation.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AssignSuperAdminDto,
  PlatformOrganizationResponseDto,
  CreateOrganizationResponseDto,
  PaginatedOrganizationsResponseDto,
  OrganizationWithStatsDto,
} from '../dto';

/**
 * Platform Organization Service
 * Handles organization management for platform admins
 */
@Injectable()
export class PlatformOrganizationService {
  private readonly logger = new Logger(PlatformOrganizationService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly invitationService: InvitationService,
  ) {}

  /**
   * Create organization with super admin and default roles
   */
  async createOrganization(
    dto: CreateOrganizationDto,
    createdBy: string,
  ): Promise<CreateOrganizationResponseDto> {
    // Check if organization code already exists
    const existingOrg = await this.organizationRepository.findOneByCode(dto.code);
    if (existingOrg) {
      throw new ConflictException(`Organization with code '${dto.code}' already exists`);
    }

    // Check if super admin email already exists
    const existingUser = await this.userRepository.findByEmail(dto.superAdminEmail);
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.superAdminEmail}' already exists`);
    }

    // 1. Create organization
    const organization = await this.organizationRepository.create({
      name: dto.name,
      code: dto.code,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country || 'India',
      pincode: dto.pincode,
      gstin: dto.gstin,
      pan: dto.pan,
    });

    this.logger.log(`Organization created: ${organization.name} (${organization.id})`);

    // 2. Create default roles for organization
    const rolesCreated = await this.createDefaultRoles(organization.id);

    // 3. Create super admin user
    const superAdminUser = await this.userRepository.create({
      email: dto.superAdminEmail,
      phone: dto.superAdminPhone,
      profileCompleted: false,
    });

    this.logger.log(`Super admin user created: ${superAdminUser.email}`);

    // 4. Get super_admin role
    const superAdminRole = await this.roleRepository.findByCodeAndOrganization(
      'super_admin',
      organization.id,
    );

    if (!superAdminRole) {
      throw new BadRequestException('Failed to create super_admin role');
    }

    // 5. Assign super_admin role to user
    await this.userRoleRepository.create({
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
      organizationId: organization.id,
    });

    this.logger.log(
      `Super admin role assigned to user ${superAdminUser.email} in org ${organization.id}`,
    );

    // 6. Create invitation
    const invitation = await this.invitationService.createInvitation({
      email: dto.superAdminEmail,
      organizationId: organization.id,
      roleId: superAdminRole.id,
      invitedBy: createdBy,
      expiryDays: 7,
    });

    const invitationLink = this.invitationService.generateInvitationLink(invitation.token);

    this.logger.log(`Invitation created for ${dto.superAdminEmail}`);

    // 7. TODO: Send invitation email via MSG91
    const invitationSent = false; // Will be true after MSG91 integration

    return {
      organization: plainToInstance(PlatformOrganizationResponseDto, organization, {
        excludeExtraneousValues: true,
      }),
      superAdminUserId: superAdminUser.id,
      invitationToken: invitation.token,
      invitationLink,
      rolesCreated: rolesCreated.map((r) => r.code),
      invitationSent,
    };
  }

  /**
   * List all organizations with pagination
   */
  async listOrganizations(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string,
  ): Promise<PaginatedOrganizationsResponseDto> {
    const skip = (page - 1) * limit;

    const result = await this.organizationRepository.findAll({
      limit,
      offset: skip,
      status: status as any,
    });

    let filtered = result.items;

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = result.items.filter((org: OrganizationEntity) => {
        return (
          org.name.toLowerCase().includes(searchLower) ||
          org.code.toLowerCase().includes(searchLower) ||
          (org.email && org.email.toLowerCase().includes(searchLower))
        );
      });
    }

    return {
      data: filtered.map((org: OrganizationEntity) =>
        plainToInstance(PlatformOrganizationResponseDto, org, {
          excludeExtraneousValues: true,
        }),
      ),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get organization by ID with statistics
   */
  async getOrganizationById(id: string): Promise<OrganizationWithStatsDto> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // TODO: Get actual statistics from respective repositories
    const stats = {
      totalUsers: 0,
      totalCustomers: 0,
      totalResellers: 0,
      totalProjects: 0,
      activeProjects: 0,
    };

    return {
      ...plainToInstance(PlatformOrganizationResponseDto, organization, {
        excludeExtraneousValues: true,
      }),
      ...stats,
    };
  }

  /**
   * Update organization
   */
  async updateOrganization(
    id: string,
    dto: UpdateOrganizationDto,
    _updatedBy: string,
  ): Promise<PlatformOrganizationResponseDto> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const updated = await this.organizationRepository.update(id, dto);

    this.logger.log(`Organization updated: ${id}`);

    return plainToInstance(PlatformOrganizationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(id: string): Promise<void> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.organizationRepository.delete(id);

    this.logger.log(`Organization soft deleted: ${id}`);
  }

  /**
   * Assign additional super admin to organization
   */
  async assignSuperAdmin(
    organizationId: string,
    dto: AssignSuperAdminDto,
    assignedBy: string,
  ): Promise<{ userId: string; invitationLink: string }> {
    const organization = await this.organizationRepository.findOneById(organizationId);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Check if user already exists
    let user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      // Create new user
      user = await this.userRepository.create({
        email: dto.email,
        phone: dto.phone,
        profileCompleted: false,
      });

      this.logger.log(`New user created for super admin: ${user.email}`);
    }

    // Get super_admin role
    const superAdminRole = await this.roleRepository.findByCodeAndOrganization(
      'super_admin',
      organizationId,
    );

    if (!superAdminRole) {
      throw new BadRequestException('super_admin role not found for organization');
    }

    // Check if user already has super_admin role in this org
    const existingRole = await this.userRoleRepository.findByUserAndRole(
      user.id,
      superAdminRole.id,
    );

    if (existingRole) {
      throw new ConflictException('User already has super_admin role in this organization');
    }

    // Assign super_admin role
    await this.userRoleRepository.create({
      userId: user.id,
      roleId: superAdminRole.id,
      organizationId,
    });

    // Create invitation
    const invitation = await this.invitationService.createInvitation({
      email: dto.email,
      organizationId,
      roleId: superAdminRole.id,
      invitedBy: assignedBy,
      expiryDays: 7,
    });

    const invitationLink = this.invitationService.generateInvitationLink(invitation.token);

    this.logger.log(`Super admin assigned to org ${organizationId}: ${dto.email}`);

    return {
      userId: user.id,
      invitationLink,
    };
  }

  /**
   * Create default roles for organization
   * Returns created roles
   */
  private async createDefaultRoles(organizationId: string) {
    const defaultRoles = [
      {
        code: 'super_admin',
        name: 'Super Administrator',
        description: 'Full access to organization',
        level: 0,
      },
      {
        code: 'admin',
        name: 'Administrator',
        description: 'Administrative access',
        level: 1,
      },
      {
        code: 'customer',
        name: 'Customer',
        description: 'Customer access',
        level: 10,
      },
      {
        code: 'reseller',
        name: 'Reseller',
        description: 'Reseller access',
        level: 10,
      },
    ];

    const createdRoles = [];

    for (const roleData of defaultRoles) {
      const role = await this.roleRepository.create({
        ...roleData,
        organizationId,
        isSystemRole: true,
      });
      createdRoles.push(role);
    }

    this.logger.log(`Created ${createdRoles.length} default roles for org ${organizationId}`);

    return createdRoles;
  }
}
