import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WarehouseStatus, WarehouseType } from '@oneohm-epc/shared/types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../dto';
import { WarehouseEntity } from '../entities/warehouse.entity';
import { InventoryStockRepository, WarehouseRepository } from '../repositories';

/**
 * Warehouse Service
 * Business logic for warehouse management
 */
@Injectable()
export class WarehouseService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly inventoryStockRepository: InventoryStockRepository,
  ) {}

  /**
   * Create a new warehouse
   */
  async create(
    organizationId: string,
    createDto: CreateWarehouseDto,
    createdBy: string,
  ): Promise<WarehouseEntity> {
    // Verify organization exists
    const org = await this.organizationRepository.findOneById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Check if code already exists
    const existingWarehouse = await this.warehouseRepository.findByCode(
      createDto.code,
      organizationId,
    );

    if (existingWarehouse) {
      throw new BadRequestException(`Warehouse with code ${createDto.code} already exists`);
    }

    // Create warehouse
    const warehouse = await this.warehouseRepository.create({
      organizationId,
      name: createDto.name,
      code: createDto.code,
      address: createDto.address,
      city: createDto.city,
      state: createDto.state,
      country: createDto.country,
      pincode: createDto.pincode,
      coordinates: createDto.coordinates,
      warehouseType: createDto.warehouseType || WarehouseType.OWN,
      warehouseManagerId: createDto.warehouseManagerId,
      contactPerson: createDto.contactPerson,
      phone: createDto.phone,
      email: createDto.email,
      status: createDto.status || WarehouseStatus.ACTIVE,
      createdBy,
    });

    return this.warehouseRepository.findById(warehouse.id, organizationId);
  }

  /**
   * Find all warehouses with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: WarehouseStatus;
      warehouseType?: WarehouseType;
      warehouseManagerId?: string;
      search?: string;
    },
  ) {
    return this.warehouseRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find warehouse by ID
   */
  async findById(id: string, organizationId: string): Promise<WarehouseEntity> {
    return this.warehouseRepository.findById(id, organizationId);
  }

  /**
   * Update warehouse
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateWarehouseDto,
    updatedBy: string,
  ): Promise<WarehouseEntity> {
    // Check if code is being changed and already exists
    if (updateDto.code) {
      const existingWarehouse = await this.warehouseRepository.findByCode(
        updateDto.code,
        organizationId,
      );

      if (existingWarehouse && existingWarehouse.id !== id) {
        throw new BadRequestException(`Warehouse with code ${updateDto.code} already exists`);
      }
    }

    // Update warehouse
    return this.warehouseRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete warehouse (soft delete)
   */
  async delete(id: string, organizationId: string, deletedBy: string): Promise<void> {
    const hasActive = await this.inventoryStockRepository.hasActiveStock(id);
    if (hasActive) {
      throw new BadRequestException('Cannot delete warehouse with active stock');
    }
    await this.warehouseRepository.softDelete(id, organizationId, deletedBy);
  }

  /**
   * Get warehouse statistics
   */
  async getStatistics(organizationId: string) {
    const countByStatus = await this.warehouseRepository.countByStatus(organizationId);

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
    };
  }

  /**
   * Get active warehouses
   */
  async getActiveWarehouses(organizationId: string): Promise<WarehouseEntity[]> {
    return this.warehouseRepository.findByType(organizationId, WarehouseType.OWN);
  }

  /**
   * Change warehouse status
   */
  async changeStatus(
    id: string,
    organizationId: string,
    status: WarehouseStatus,
    updatedBy: string,
  ): Promise<WarehouseEntity> {
    return this.warehouseRepository.update(id, organizationId, {
      status,
      updatedBy,
    });
  }
}
