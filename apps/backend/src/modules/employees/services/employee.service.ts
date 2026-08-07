import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { EmployeeProfileKind, UserStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { ProfileService } from '../../users/services/profile.service';
import { CreateEmployeeDto, EmployeeResponseDto, UpdateEmployeeDto } from '../dto';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { EmployeeProfileRepository } from '../repositories/employee-profile.repository';

/**
 * Employee Service
 * Handles employee profile business logic
 */
@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly employeeRepository: EmployeeProfileRepository,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => UserRoleRepository))
    private readonly userRoleRepository: UserRoleRepository,
    @Inject(forwardRef(() => ProfileService))
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Create a new employee profile
   */
  async create(dto: CreateEmployeeDto, createdBy?: string): Promise<EmployeeResponseDto> {
    // Check if employee profile already exists for this user in this org
    const existing = await this.employeeRepository.findByUserAndOrganization(
      dto.userId,
    );

    if (existing) {
      throw new BadRequestException(
        'Employee profile already exists for this user in this organization',
      );
    }

    const profileKind = dto.profileKind ?? EmployeeProfileKind.STAFF;
    let commissionDefaults: Partial<CreateEmployeeDto> = {};

    if (profileKind === EmployeeProfileKind.RESELLER) {
      commissionDefaults = await this.validateResellerFields(dto);
    }

    // Create profile
    const profile = await this.employeeRepository.create({
      ...dto,
      ...commissionDefaults,
      profileKind,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      status: dto.status ?? UserStatus.ACTIVE,
      createdBy,
    });

    this.logger.log(
      `Created employee profile ${profile.id} for user ${dto.userId}`,
    );

    // Auto-assign default role
    const roleCode = profileKind === EmployeeProfileKind.RESELLER ? 'reseller' : 'employee_basic';
    await this.profileService.assignDefaultRole(
      dto.userId,
      roleCode,
      createdBy,
    );

    return this.toResponseDto(profile);
  }

  /**
   * Validate reseller-kind fields on create (company code / email uniqueness)
   * and return the default commission percentage. Ported from ResellerService.create.
   */
  private async validateResellerFields(
    dto: Pick<CreateEmployeeDto, 'companyCode' | 'email' | 'commissionPercentage'>,
  ): Promise<Partial<CreateEmployeeDto>> {
    if (dto.companyCode) {
      const existingByCode = await this.employeeRepository.findByCompanyCode(
        dto.companyCode,
      );
      if (existingByCode) {
        throw new ConflictException(
          `Reseller with company code '${dto.companyCode}' already exists`,
        );
      }
    }

    if (dto.email) {
      const existingByEmail = await this.employeeRepository.findByEmail(dto.email);
      if (existingByEmail) {
        throw new ConflictException(`Reseller with email '${dto.email}' already exists`);
      }
    }

    return {
      commissionPercentage: dto.commissionPercentage ?? 4.0,
    };
  }

  /**
   * Create employee profile from generic profile data (used by ProfileService)
   */
  async createFromProfileData(
    userId: string,
    profileData: Record<string, unknown>,
    createdBy?: string,
  ): Promise<EmployeeProfileEntity> {
    // Check if employee profile already exists
    const existing = await this.employeeRepository.findByUserAndOrganization(
      userId,
    );

    if (existing) {
      throw new BadRequestException(
        'Employee profile already exists for this user in this organization',
      );
    }

    // Create profile
    const profile = await this.employeeRepository.create({
      userId,
      ...profileData,
      joiningDate: profileData.joiningDate
        ? new Date(profileData.joiningDate as string)
        : undefined,
      dateOfBirth: profileData.dateOfBirth
        ? new Date(profileData.dateOfBirth as string)
        : undefined,
      status: (profileData.status as UserStatus) ?? UserStatus.ACTIVE,
      createdBy,
    });

    this.logger.log(
      `Created employee profile ${profile.id} for user ${userId}`,
    );

    return profile;
  }

  /**
   * Find employee by ID
   */
  async findById(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.toResponseDto(employee);
  }

  /**
   * Find employee by user and organization
   */
  async findByUserAndOrganization(
    userId: string,
  ): Promise<EmployeeResponseDto | null> {
    const employee = await this.employeeRepository.findByUserAndOrganization(
      userId,
    );

    return employee ? this.toResponseDto(employee) : null;
  }

  /**
   * Find all employees by user ID
   */
  async findByUserId(userId: string): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.findByUserId(userId);
    return employees.map((e) => this.toResponseDto(e));
  }

  /**
   * Find all employees in an organization (paginated)
   */
  async findByOrganization(
    page = 1,
    limit = 20,
    status?: UserStatus,
    profileKind?: EmployeeProfileKind,
  ): Promise<{
    items: EmployeeResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.employeeRepository.findByOrganization(
      page,
      limit,
      status,
      profileKind,
    );

    const userIds = result.items.map((e) => e.userId);
    const allRoles = await this.userRoleRepository.findByUserIds(userIds);
    const rolesMap = new Map<string, string[]>();
    for (const ur of allRoles) {
      const list = rolesMap.get(ur.userId) || [];
      if (ur.role) list.push(ur.role);
      rolesMap.set(ur.userId, list);
    }

    const items = result.items.map((e) => {
      const dto = this.toResponseDto(e);
      dto.roles = rolesMap.get(e.userId) || [];
      return dto;
    });

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Find employees by department
   */
  async findByDepartment(
    department: string,
  ): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.findByDepartment(department);
    return employees.map((e) => this.toResponseDto(e));
  }

  /**
   * Update employee profile
   * Auto-sets user.profileCompleted = true if required fields are filled
   */
  async update(
    id: string,
    dto: UpdateEmployeeDto,
    updatedBy?: string,
  ): Promise<EmployeeResponseDto> {
    const existing = await this.employeeRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    if (existing.profileKind === EmployeeProfileKind.RESELLER) {
      // Check for email conflicts (if email is being updated)
      if (dto.email) {
        const existingByEmail = await this.employeeRepository.findByEmail(dto.email,
        );
        if (existingByEmail && existingByEmail.id !== id) {
          throw new ConflictException(`Reseller with email '${dto.email}' already exists`);
        }
      }
    }

    const updates: Partial<EmployeeProfileEntity> = {
      ...dto,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      updatedBy,
    };

    const updated = await this.employeeRepository.update(id, updates);

    if (!updated) {
      throw new NotFoundException('Employee not found after update');
    }

    this.logger.log(`Updated employee profile ${id}`);

    // Auto-set profileCompleted if required fields are filled
    if (this.isProfileComplete(updated)) {
      await this.userRepository.markProfileCompleted(updated.userId);
      this.logger.log(`Marked user ${updated.userId} profileCompleted = true`);
    }

    return this.toResponseDto(updated);
  }

  /**
   * Update employee status
   */
  async updateStatus(
    id: string,
    status: UserStatus,
    updatedBy: string,
  ): Promise<EmployeeResponseDto> {
    const existing = await this.employeeRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    await this.employeeRepository.updateStatus(id, status, updatedBy);

    const updated = await this.employeeRepository.findById(id);
    if (!updated) {
      throw new NotFoundException('Employee not found after status update');
    }

    this.logger.log(`Updated employee ${id} status to ${status}`);

    return this.toResponseDto(updated);
  }

  /**
   * Soft delete employee profile
   */
  async delete(id: string, deletedBy: string): Promise<void> {
    const existing = await this.employeeRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    await this.employeeRepository.softDelete(id, deletedBy);
    this.logger.log(`Deleted employee profile ${id}`);
  }

  /**
   * Check if employee profile exists
   */
  async exists(userId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findByUserAndOrganization(
      userId,
    );
    return !!employee;
  }

  /**
   * Get raw entity (for internal use)
   */
  async getEntity(userId: string): Promise<EmployeeProfileEntity | null> {
    return this.employeeRepository.findByUserAndOrganization(userId);
  }

  /**
   * Find employee by ID, verifying it belongs to the given organization.
   * Used by the commissions submodule (ported from ResellerService.findById).
   */
  async findByIdInOrganization(id: string): Promise<EmployeeProfileEntity> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }


    return employee;
  }

  /**
   * Update reseller performance metrics.
   * Called by the commission service when commissions are paid.
   * Ported from ResellerService.updatePerformanceMetrics.
   */
  async updatePerformanceMetrics(
    id: string,
    metrics: {
      totalLeadsGenerated?: number;
      totalProjectsConverted?: number;
      totalRevenueGenerated?: number;
      totalCommissionEarned?: number;
    },
  ): Promise<void> {
    this.logger.log(`Updating performance metrics for employee: ${id}`);

    // Verify employee exists and belongs to organization
    await this.findByIdInOrganization(id);

    await this.employeeRepository.updatePerformanceMetrics(id, metrics);

    this.logger.log(`Performance metrics updated for employee: ${id}`);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(entity: EmployeeProfileEntity): EmployeeResponseDto {
    return plainToInstance(EmployeeResponseDto, entity, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Check if employee profile has all required fields filled
   */
  private isProfileComplete(profile: EmployeeProfileEntity): boolean {
    return !!(
      profile.dateOfBirth &&
      profile.gender &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.pincode
    );
  }
}
