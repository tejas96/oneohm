import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { UserStatus } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';

import { UserRepository } from '../../users/repositories/user.repository';
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
  ) {}

  /**
   * Create a new employee profile
   */
  async create(dto: CreateEmployeeDto, createdBy?: string): Promise<EmployeeResponseDto> {
    // Check if employee profile already exists for this user in this org
    const existing = await this.employeeRepository.findByUserAndOrganization(
      dto.userId,
      dto.organizationId,
    );

    if (existing) {
      throw new BadRequestException(
        'Employee profile already exists for this user in this organization',
      );
    }

    // Create profile
    const profile = await this.employeeRepository.create({
      ...dto,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      status: dto.status ?? UserStatus.ACTIVE,
      createdBy,
    });

    this.logger.log(
      `Created employee profile ${profile.id} for user ${dto.userId} in org ${dto.organizationId}`,
    );

    return this.toResponseDto(profile);
  }

  /**
   * Create employee profile from generic profile data (used by ProfileService)
   */
  async createFromProfileData(
    userId: string,
    organizationId: string,
    profileData: Record<string, unknown>,
    createdBy?: string,
  ): Promise<EmployeeProfileEntity> {
    // Check if employee profile already exists
    const existing = await this.employeeRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );

    if (existing) {
      throw new BadRequestException(
        'Employee profile already exists for this user in this organization',
      );
    }

    // Create profile
    const profile = await this.employeeRepository.create({
      userId,
      organizationId,
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
      `Created employee profile ${profile.id} for user ${userId} in org ${organizationId}`,
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

    return this.toResponseDto(employee);
  }

  /**
   * Find employee by user and organization
   */
  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<EmployeeResponseDto | null> {
    const employee = await this.employeeRepository.findByUserAndOrganization(
      userId,
      organizationId,
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
    organizationId: string,
    page = 1,
    limit = 20,
    status?: UserStatus,
  ): Promise<{
    items: EmployeeResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.employeeRepository.findByOrganization(
      organizationId,
      page,
      limit,
      status,
    );

    return {
      items: result.items.map((e) => this.toResponseDto(e)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Find employees by department
   */
  async findByDepartment(
    organizationId: string,
    department: string,
  ): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.findByDepartment(organizationId, department);
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
  async exists(userId: string, organizationId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findByUserAndOrganization(
      userId,
      organizationId,
    );
    return !!employee;
  }

  /**
   * Get raw entity (for internal use)
   */
  async getEntity(userId: string, organizationId: string): Promise<EmployeeProfileEntity | null> {
    return this.employeeRepository.findByUserAndOrganization(userId, organizationId);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(entity: EmployeeProfileEntity): EmployeeResponseDto {
    return plainToInstance(EmployeeResponseDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}
