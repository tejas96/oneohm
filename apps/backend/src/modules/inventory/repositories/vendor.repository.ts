import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VendorStatus, VendorType } from '@tejas96/shared/types';
import { IsNull, Repository } from 'typeorm';

import { VendorEntity } from '../entities/vendor.entity';

/**
 * Vendor Repository
 * Handles database operations for vendors
 */
@Injectable()
export class VendorRepository {
  constructor(
    @InjectRepository(VendorEntity)
    private readonly repository: Repository<VendorEntity>,
  ) {}

  /**
   * Create a new vendor
   */
  async create(vendorData: Partial<VendorEntity>): Promise<VendorEntity> {
    const vendor = this.repository.create(vendorData);
    return this.repository.save(vendor);
  }

  /**
   * Find vendor by ID with relations
   */
  async findById(id: string): Promise<VendorEntity> {
    const vendor = await this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [],
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  /**
   * Find vendor by code
   */
  async findByCode(code: string): Promise<VendorEntity | null> {
    return this.repository.findOne({
      where: { code, deletedAt: IsNull() },
    });
  }

  /**
   * Find all vendors with filters and pagination
   */
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: VendorStatus;
      vendorType?: VendorType;
      search?: string;
    },
  ): Promise<{ vendors: VendorEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('vendor')
      .andWhere('vendor.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('vendor.status = :status', { status: filters.status });
    }

    if (filters?.vendorType) {
      query.andWhere('vendor.vendorType = :vendorType', { vendorType: filters.vendorType });
    }

    if (filters?.search) {
      query.andWhere(
        '(vendor.name ILIKE :search OR vendor.code ILIKE :search OR vendor.contactPerson ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('vendor.name', 'ASC');

    const [vendors, total] = await query.getManyAndCount();

    return { vendors, total };
  }

  /**
   * Update vendor
   */
  async update(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<VendorEntity> {
    const vendor = await this.findById(id);

    Object.assign(vendor, updateData);

    return this.repository.save(vendor);
  }

  /**
   * Soft delete vendor
   */
  async softDelete(id: string, deletedBy: string): Promise<void> {
    const vendor = await this.findById(id);

    vendor.deletedAt = new Date();
    vendor.updatedBy = deletedBy;

    await this.repository.save(vendor);
  }

  /**
   * Count vendors by status
   */
  async countByStatus(): Promise<Record<VendorStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('vendor')
      .select('vendor.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .andWhere('vendor.deletedAt IS NULL')
      .groupBy('vendor.status')
      .getRawMany<{ status: VendorStatus; count: string }>();

    const counts: Record<VendorStatus, number> = {
      [VendorStatus.ACTIVE]: 0,
      [VendorStatus.INACTIVE]: 0,
      [VendorStatus.BLACKLISTED]: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Count vendors by type
   */
  async countByType(): Promise<Record<VendorType, number>> {
    const result = await this.repository
      .createQueryBuilder('vendor')
      .select('vendor.vendorType', 'vendorType')
      .addSelect('COUNT(*)', 'count')
      .andWhere('vendor.deletedAt IS NULL')
      .groupBy('vendor.vendorType')
      .getRawMany<{ vendorType: VendorType; count: string }>();

    const counts: Record<VendorType, number> = {
      [VendorType.SUPPLIER]: 0,
      [VendorType.CONTRACTOR]: 0,
      [VendorType.SERVICE_PROVIDER]: 0,
    };

    for (const row of result) {
      counts[row.vendorType] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Find vendors by type and status
   */
  async findByTypeAndStatus(
    vendorType: VendorType,
    status: VendorStatus = VendorStatus.ACTIVE,
  ): Promise<VendorEntity[]> {
    return this.repository.find({
      where: {
        vendorType,
        status,
        deletedAt: IsNull(),
      },
      order: { name: 'ASC' },
    });
  }

  /**
   * Update vendor rating
   */
  async updateRating(id: string, rating: number): Promise<VendorEntity> {
    const vendor = await this.findById(id);

    vendor.rating = rating;

    return this.repository.save(vendor);
  }
}
