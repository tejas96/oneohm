import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';

import { RoleEntity } from '../../iam/entities/role.entity';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { UserRoleEntity } from '../../users/entities/user-role.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { InvitationService } from '../../users/services/invitation.service';
import {
  AssignSuperAdminDto,
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
  OrganizationResponseDto,
  OrganizationWithStatsDto,
  PaginatedOrganizationsResponseDto,
  UpdateOrganizationDto,
} from '../dto';
import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationRepository } from '../repositories/organization.repository';

/**
 * Organization Service
 * Handles all organization management operations
 * Including creation with default roles, super admin setup, and invitations
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    @Inject(forwardRef(() => RoleRepository))
    private readonly roleRepository: RoleRepository,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => UserRoleRepository))
    private readonly userRoleRepository: UserRoleRepository,
    @Inject(forwardRef(() => InvitationService))
    private readonly invitationService: InvitationService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CREATE ====================

  /**
   * Create organization with super admin and default roles
   * @param dto - Organization creation data with super admin details
   * @param createdBy - Platform admin user ID
   */
  async create(
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

    // Transaction: org + roles + user + role assignment (atomic)
    const { organization, rolesCreated, superAdminUser, superAdminRole } =
      await this.dataSource.transaction(async (manager) => {
        const orgRepo = manager.getRepository(OrganizationEntity);
        const roleRepo = manager.getRepository(RoleEntity);
        const userRepo = manager.getRepository(UserEntity);
        const userRoleRepo = manager.getRepository(UserRoleEntity);

        const org = await orgRepo.save(
          orgRepo.create({
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
            timezone: dto.timezone || 'Asia/Kolkata',
            currency: dto.currency || 'INR',
            dateFormat: dto.dateFormat || 'DD-MM-YYYY',
            defaultProjectTimelineWeeks: dto.defaultProjectTimelineWeeks || 4,
            defaultQuoteValidityDays: dto.defaultQuoteValidityDays || 30,
            maxQuoteVersions: dto.maxQuoteVersions || 3,
            subscriptionPlan: dto.subscriptionPlan,
            subscriptionExpiresAt: dto.subscriptionExpiresAt,
            createdBy,
          }),
        );

        this.logger.log(`Organization created: ${org.name} (${org.id})`);

        const roles: RoleEntity[] = [];
        for (const roleDef of this.getDefaultRoleDefinitions()) {
          const role = await roleRepo.save(
            roleRepo.create({ ...roleDef, organizationId: org.id, isSystemRole: true }),
          );
          roles.push(role);
        }
        this.logger.log(`Created ${roles.length} default roles for org ${org.id}`);

        const adminUser = await userRepo.save(
          userRepo.create({
            email: dto.superAdminEmail,
            firstName: dto.superAdminFirstName,
            lastName: dto.superAdminLastName,
            phone: dto.superAdminPhone,
            passwordHash: dto.superAdminPassword,
            profileCompleted: false,
          }),
        );

        const adminRole = roles.find((r) => r.code === 'super_admin');
        if (!adminRole) {
          throw new BadRequestException('Failed to create super_admin role');
        }

        await userRoleRepo.save(
          userRoleRepo.create({
            userId: adminUser.id,
            roleId: adminRole.id,
            role: adminRole.code,
            organizationId: org.id,
          }),
        );

        return {
          organization: org,
          rolesCreated: roles,
          superAdminUser: adminUser,
          superAdminRole: adminRole,
        };
      });

    // Invitation (outside transaction — safe to fail independently)
    const invitation = await this.invitationService.createInvitation({
      email: dto.superAdminEmail,
      organizationId: organization.id,
      roleId: superAdminRole.id,
      invitedBy: createdBy,
      expiryDays: 7,
    });

    const invitationLink = this.invitationService.generateInvitationLink(invitation.token);

    this.logger.log(`Invitation created for ${dto.superAdminEmail}`);

    return {
      organization: plainToInstance(OrganizationResponseDto, organization, {
        excludeExtraneousValues: true,
      }),
      superAdminUserId: superAdminUser.id,
      invitationToken: invitation.token,
      invitationLink,
      rolesCreated: rolesCreated.map((r) => r.code),
      invitationSent: false,
    };
  }

  // ==================== READ ====================

  /**
   * List all organizations with pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: OrganizationStatus,
  ): Promise<PaginatedOrganizationsResponseDto> {
    const skip = (page - 1) * limit;

    const result = await this.organizationRepository.findAll({
      limit,
      offset: skip,
      status,
      search,
    });

    return {
      data: result.items.map((org: OrganizationEntity) =>
        plainToInstance(OrganizationResponseDto, org, {
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
  async findById(id: string): Promise<OrganizationWithStatsDto> {
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
      ...plainToInstance(OrganizationResponseDto, organization, {
        excludeExtraneousValues: true,
      }),
      ...stats,
    };
  }

  /**
   * Get organization by code
   */
  async findByCode(code: string): Promise<OrganizationResponseDto | null> {
    const organization = await this.organizationRepository.findOneByCode(code);

    if (!organization) {
      return null;
    }

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== UPDATE ====================

  /**
   * Update organization
   */
  async update(
    id: string,
    dto: UpdateOrganizationDto,
    updatedBy: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const updated = await this.organizationRepository.update(id, {
      ...dto,
      updatedBy,
    });

    this.logger.log(`Organization updated: ${id}`);

    return plainToInstance(OrganizationResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update organization status
   */
  async updateStatus(
    id: string,
    status: OrganizationStatus,
    updatedBy: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (organization.status === status) {
      throw new BadRequestException(`Organization is already in '${status}' status`);
    }

    return this.update(id, { status }, updatedBy);
  }

  // ==================== DELETE ====================

  /**
   * Soft delete organization
   */
  async delete(id: string): Promise<void> {
    const organization = await this.organizationRepository.findOneById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.organizationRepository.delete(id);

    this.logger.log(`Organization soft deleted: ${id}`);
  }

  // ==================== SUPER ADMIN ====================

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
        firstName: dto.firstName,
        lastName: dto.lastName,
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
      role: superAdminRole.code,
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

  // ==================== PRIVATE HELPERS ====================

  private getDefaultRoleDefinitions(): Array<{
    code: string;
    name: string;
    description: string;
    level: number;
  }> {
    return [
      {
        code: 'super_admin',
        name: 'Super Administrator',
        description: 'Full access to organization',
        level: 0,
      },
      { code: 'admin', name: 'Administrator', description: 'Administrative access', level: 1 },
      {
        code: 'manager',
        name: 'Manager',
        description: 'Management access with limited admin capabilities',
        level: 2,
      },
      {
        code: 'employee_basic',
        name: 'Employee (Basic)',
        description: 'Basic employee access',
        level: 5,
      },
      {
        code: 'field_worker',
        name: 'Field Worker',
        description: 'Field worker access - can create leads and quotes',
        level: 5,
      },
      {
        code: 'sales_person',
        name: 'Sales Person',
        description: 'Sales access - can manage leads and quotes',
        level: 5,
      },
      {
        code: 'telecaller',
        name: 'Telecaller',
        description: 'Telecaller access - can manage leads',
        level: 6,
      },
      {
        code: 'customer',
        name: 'Customer',
        description: 'Customer self-service access',
        level: 10,
      },
      { code: 'reseller', name: 'Reseller', description: 'Reseller partner access', level: 10 },
    ];
  }
}
