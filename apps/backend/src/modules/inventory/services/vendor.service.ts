import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorStatus, VendorType } from '@tejas96/shared/types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreateVendorDto, UpdateVendorDto } from '../dto';
import { VendorEntity } from '../entities/vendor.entity';
import { PurchaseOrderRepository, VendorRepository } from '../repositories';

/**
 * Vendor Service
 * Business logic for vendor management
 */
@Injectable()
export class VendorService {
  constructor(
    private readonly vendorRepository: VendorRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
  ) {}

  /**
   * Create a new vendor
   */
  async create(
    organizationId: string,
    createDto: CreateVendorDto,
    createdBy: string,
  ): Promise<VendorEntity> {
    // Verify organization exists
    const org = await this.organizationRepository.findOneById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Check if code already exists
    const existingVendor = await this.vendorRepository.findByCode(createDto.code, organizationId);

    if (existingVendor) {
      throw new BadRequestException(`Vendor with code ${createDto.code} already exists`);
    }

    // Create vendor
    const vendor = await this.vendorRepository.create({
      organizationId,
      name: createDto.name,
      code: createDto.code,
      vendorType: createDto.vendorType,
      contactPerson: createDto.contactPerson,
      email: createDto.email,
      phone: createDto.phone,
      alternatePhone: createDto.alternatePhone,
      address: createDto.address,
      city: createDto.city,
      state: createDto.state,
      pincode: createDto.pincode,
      gstin: createDto.gstin,
      pan: createDto.pan,
      bankName: createDto.bankName,
      accountNumber: createDto.accountNumber,
      ifscCode: createDto.ifscCode,
      paymentTerms: createDto.paymentTerms,
      creditDays: createDto.creditDays,
      rating: createDto.rating,
      status: createDto.status ?? VendorStatus.ACTIVE,
      notes: createDto.notes,
      createdBy,
    });

    return this.vendorRepository.findById(vendor.id, organizationId);
  }

  /**
   * Find all vendors with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: VendorStatus;
      vendorType?: VendorType;
      search?: string;
    },
  ): Promise<{ vendors: VendorEntity[]; total: number }> {
    return this.vendorRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find vendor by ID
   */
  async findById(id: string, organizationId: string): Promise<VendorEntity> {
    return this.vendorRepository.findById(id, organizationId);
  }

  /**
   * Update vendor
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateVendorDto,
    updatedBy: string,
  ): Promise<VendorEntity> {
    // Check if code is being changed and already exists
    if (updateDto.code) {
      const existingVendor = await this.vendorRepository.findByCode(updateDto.code, organizationId);

      if (existingVendor && existingVendor.id !== id) {
        throw new BadRequestException(`Vendor with code ${updateDto.code} already exists`);
      }
    }

    // Update vendor
    return this.vendorRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete vendor (soft delete)
   */
  async delete(id: string, organizationId: string, deletedBy: string): Promise<void> {
    const hasActive = await this.purchaseOrderRepository.hasActivePOs(id, organizationId);
    if (hasActive) {
      throw new BadRequestException('Cannot delete vendor with active purchase orders');
    }
    await this.vendorRepository.softDelete(id, organizationId, deletedBy);
  }

  /**
   * Get vendor statistics
   */
  async getStatistics(organizationId: string) {
    const [countByStatus, countByType] = await Promise.all([
      this.vendorRepository.countByStatus(organizationId),
      this.vendorRepository.countByType(organizationId),
    ]);

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
      byType: countByType,
    };
  }

  /**
   * Get active vendors by type
   */
  async getActiveVendorsByType(
    organizationId: string,
    vendorType: VendorType,
  ): Promise<VendorEntity[]> {
    return this.vendorRepository.findByTypeAndStatus(
      organizationId,
      vendorType,
      VendorStatus.ACTIVE,
    );
  }

  /**
   * Change vendor status
   */
  async changeStatus(
    id: string,
    organizationId: string,
    status: VendorStatus,
    updatedBy: string,
  ): Promise<VendorEntity> {
    return this.vendorRepository.update(id, organizationId, {
      status,
      updatedBy,
    });
  }

  /**
   * Update vendor rating
   */
  async updateRating(id: string, organizationId: string, rating: number): Promise<VendorEntity> {
    if (rating < 0 || rating > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    return this.vendorRepository.updateRating(id, organizationId, rating);
  }
}
