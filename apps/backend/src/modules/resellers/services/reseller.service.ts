import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResellerStatus } from '@oneohm-epc/shared-types';

import { CreateResellerDto } from '../dto/create-reseller.dto';
import { UpdateResellerDto } from '../dto/update-reseller.dto';
import { ResellerEntity } from '../entities/reseller.entity';
import { ResellerRepository } from '../repositories/reseller.repository';

/**
 * Reseller Service
 * Business logic for reseller management
 */
@Injectable()
export class ResellerService {
  private readonly logger = new Logger(ResellerService.name);

  constructor(private readonly resellerRepository: ResellerRepository) {}

  /**
   * Create a new reseller
   */
  async create(
    organizationId: string,
    createDto: CreateResellerDto,
    createdBy?: string,
  ): Promise<ResellerEntity> {
    this.logger.log(`Creating reseller: ${createDto.companyName}`);

    // Check if company code already exists
    const existingByCode = await this.resellerRepository.findByCompanyCode(
      organizationId,
      createDto.companyCode,
    );
    if (existingByCode) {
      throw new ConflictException(
        `Reseller with company code '${createDto.companyCode}' already exists`,
      );
    }

    // Check if email already exists
    const existingByEmail = await this.resellerRepository.findByEmail(
      organizationId,
      createDto.email,
    );
    if (existingByEmail) {
      throw new ConflictException(`Reseller with email '${createDto.email}' already exists`);
    }

    // Validate commission percentage range
    if (createDto.commissionPercentage !== undefined) {
      const min = createDto.commissionMinPercentage ?? 2.0;
      const max = createDto.commissionMaxPercentage ?? 10.0;

      if (createDto.commissionPercentage < min || createDto.commissionPercentage > max) {
        throw new BadRequestException(`Commission percentage must be between ${min}% and ${max}%`);
      }
    }

    const reseller = await this.resellerRepository.create({
      ...createDto,
      organizationId,
      createdBy,
      updatedBy: createdBy,
    });

    this.logger.log(`Reseller created successfully: ${reseller.id}`);
    return reseller;
  }

  /**
   * Find reseller by ID
   */
  async findById(id: string, organizationId: string): Promise<ResellerEntity> {
    const reseller = await this.resellerRepository.findById(id);

    if (reseller?.organizationId !== organizationId) {
      throw new NotFoundException(`Reseller with ID '${id}' not found`);
    }

    return reseller;
  }

  /**
   * Find all resellers for an organization
   */
  async findAll(organizationId: string): Promise<ResellerEntity[]> {
    return this.resellerRepository.findAll(organizationId);
  }

  /**
   * Update reseller
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateResellerDto,
    updatedBy?: string,
  ): Promise<ResellerEntity> {
    this.logger.log(`Updating reseller: ${id}`);

    // Verify reseller exists and belongs to organization
    const reseller = await this.findById(id, organizationId);

    // Check for email conflicts (if email is being updated)
    if (updateDto.email) {
      const existingByEmail = await this.resellerRepository.findByEmail(
        organizationId,
        updateDto.email,
      );
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException(`Reseller with email '${updateDto.email}' already exists`);
      }
    }

    // Validate commission percentage range (if being updated)
    if (updateDto.commissionPercentage !== undefined) {
      const min = updateDto.commissionMinPercentage ?? reseller.commissionMinPercentage;
      const max = updateDto.commissionMaxPercentage ?? reseller.commissionMaxPercentage;

      if (updateDto.commissionPercentage < min || updateDto.commissionPercentage > max) {
        throw new BadRequestException(`Commission percentage must be between ${min}% and ${max}%`);
      }
    }

    const updated = await this.resellerRepository.update(id, {
      ...updateDto,
      updatedBy,
    });

    this.logger.log(`Reseller updated successfully: ${id}`);
    return updated;
  }

  /**
   * Update reseller status (generic status management)
   */
  async updateStatus(
    id: string,
    organizationId: string,
    newStatus: ResellerStatus,
    updatedBy?: string,
  ): Promise<ResellerEntity> {
    this.logger.log(`Updating reseller ${id} status to: ${newStatus}`);

    const reseller = await this.findById(id, organizationId);

    if (reseller.status === newStatus) {
      throw new BadRequestException(`Reseller is already in '${newStatus}' status`);
    }

    const updated = await this.resellerRepository.update(id, {
      status: newStatus,
      updatedBy,
    });

    this.logger.log(`Reseller status updated successfully: ${id} -> ${newStatus}`);
    return updated;
  }

  /**
   * Delete reseller (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    this.logger.log(`Deleting reseller: ${id}`);

    // Verify reseller exists and belongs to organization
    await this.findById(id, organizationId);

    // TODO: Check if reseller has active commissions or linked customers
    // May need to prevent deletion or handle cascade logic

    await this.resellerRepository.softDelete(id);

    this.logger.log(`Reseller deleted successfully: ${id}`);
  }

  /**
   * Update reseller performance metrics
   * Called by commission service when commissions are paid
   */
  async updatePerformanceMetrics(
    id: string,
    organizationId: string,
    metrics: {
      totalLeadsGenerated?: number;
      totalProjectsConverted?: number;
      totalRevenueGenerated?: number;
      totalCommissionEarned?: number;
    },
  ): Promise<void> {
    this.logger.log(`Updating performance metrics for reseller: ${id}`);

    // Verify reseller exists
    await this.findById(id, organizationId);

    await this.resellerRepository.updatePerformanceMetrics(id, metrics);

    this.logger.log(`Performance metrics updated for reseller: ${id}`);
  }
}
