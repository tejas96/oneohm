import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WarehouseStatus, WarehouseType } from '@tejas96/shared/types';

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
    private readonly inventoryStockRepository: InventoryStockRepository,
  ) {}

  /**
   * Create a new warehouse
   */
  async create(
    createDto: CreateWarehouseDto,
    createdBy: string,
  ): Promise<WarehouseEntity> {
    // Verify organization exists

    // Check if code already exists
    const existingWarehouse = await this.warehouseRepository.findByCode(
      createDto.code,
    );

    if (existingWarehouse) {
      throw new BadRequestException(`Warehouse with code ${createDto.code} already exists`);
    }

    // Create warehouse
    const warehouse = await this.warehouseRepository.create({
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

    return this.warehouseRepository.findById(warehouse.id);
  }

  /**
   * Find all warehouses with filters
   */
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: WarehouseStatus;
      warehouseType?: WarehouseType;
      warehouseManagerId?: string;
      search?: string;
    },
  ) {
    return this.warehouseRepository.findAll(page, limit, filters);
  }

  /**
   * Find warehouse by ID
   */
  async findById(id: string): Promise<WarehouseEntity> {
    return this.warehouseRepository.findById(id);
  }

  /**
   * Update warehouse
   */
  async update(
    id: string,
    updateDto: UpdateWarehouseDto,
    updatedBy: string,
  ): Promise<WarehouseEntity> {
    // Check if code is being changed and already exists
    if (updateDto.code) {
      const existingWarehouse = await this.warehouseRepository.findByCode(
        updateDto.code,
      );

      if (existingWarehouse && existingWarehouse.id !== id) {
        throw new BadRequestException(`Warehouse with code ${updateDto.code} already exists`);
      }
    }

    // Update warehouse
    return this.warehouseRepository.update(id, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete warehouse (soft delete)
   */
  async delete(id: string, deletedBy: string): Promise<void> {
    const hasActive = await this.inventoryStockRepository.hasActiveStock(id);
    if (hasActive) {
      throw new BadRequestException('Cannot delete warehouse with active stock');
    }
    await this.warehouseRepository.softDelete(id, deletedBy);
  }

  /**
   * Get warehouse statistics
   */
  async getStatistics() {
    const countByStatus = await this.warehouseRepository.countByStatus();

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
    };
  }

  /**
   * Get active warehouses
   */
  async getActiveWarehouses(): Promise<WarehouseEntity[]> {
    return this.warehouseRepository.findByType(WarehouseType.OWN);
  }

  /**
   * Change warehouse status
   */
  async changeStatus(
    id: string,
    status: WarehouseStatus,
    updatedBy: string,
  ): Promise<WarehouseEntity> {
    return this.warehouseRepository.update(id, {
      status,
      updatedBy,
    });
  }
}
