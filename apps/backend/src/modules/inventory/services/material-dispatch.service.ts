import { BadRequestException, Injectable } from '@nestjs/common';
import { MaterialDispatchStatus } from '@oneohm-epc/shared-types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import {
  CreateMaterialDispatchDto,
  UpdateMaterialDispatchDto,
  UpdateMaterialDispatchStatusDto,
} from '../dto';
import { MaterialDispatchEntity } from '../entities/material-dispatch.entity';
import {
  MaterialDispatchItemRepository,
  MaterialDispatchRepository,
  WarehouseRepository,
} from '../repositories';

/**
 * Material Dispatch Service
 * Business logic for dispatching materials to project sites
 */
@Injectable()
export class MaterialDispatchService {
  constructor(
    private readonly materialDispatchRepository: MaterialDispatchRepository,
    private readonly materialDispatchItemRepository: MaterialDispatchItemRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Create a new material dispatch
   */
  async create(
    organizationId: string,
    createDto: CreateMaterialDispatchDto,
    createdBy: string,
  ): Promise<MaterialDispatchEntity> {
    // Verify dependencies
    await Promise.all([
      this.organizationRepository.findOneById(organizationId),
      this.projectRepository.findById(createDto.projectId, organizationId),
      this.warehouseRepository.findById(createDto.warehouseId, organizationId),
    ]);

    // Generate dispatch number
    const dispatchNumber =
      await this.materialDispatchRepository.generateDispatchNumber(organizationId);

    // Create dispatch
    const dispatch = await this.materialDispatchRepository.create({
      organizationId,
      projectId: createDto.projectId,
      warehouseId: createDto.warehouseId,
      dispatchNumber,
      dispatchDate: createDto.dispatchDate ? new Date(createDto.dispatchDate) : new Date(),
      expectedDeliveryDate: createDto.expectedDeliveryDate
        ? new Date(createDto.expectedDeliveryDate)
        : undefined,
      vehicleNumber: createDto.vehicleNumber,
      driverName: createDto.driverName,
      driverPhone: createDto.driverPhone,
      transportCompany: createDto.transportCompany,
      status: createDto.status || MaterialDispatchStatus.PREPARED,
      notes: createDto.notes,
      createdBy,
    });

    // Create dispatch items
    if (createDto.items && createDto.items.length > 0) {
      const items = createDto.items.map((item) => ({
        dispatchId: dispatch.id,
        productId: item.productId,
        quantity: item.quantity,
        batchNumber: item.batchNumber,
        serialNumbers: item.serialNumbers,
        notes: item.notes,
      }));

      await this.materialDispatchItemRepository.createMany(items);
    }

    return this.materialDispatchRepository.findById(dispatch.id, organizationId);
  }

  /**
   * Find all dispatches with filters
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: MaterialDispatchStatus;
      projectId?: string;
      warehouseId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ) {
    return this.materialDispatchRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find dispatch by ID
   */
  async findById(id: string, organizationId: string): Promise<MaterialDispatchEntity> {
    return this.materialDispatchRepository.findById(id, organizationId);
  }

  /**
   * Find dispatches by project
   */
  async findByProject(projectId: string): Promise<MaterialDispatchEntity[]> {
    return this.materialDispatchRepository.findByProject(projectId);
  }

  /**
   * Update dispatch
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateMaterialDispatchDto,
    updatedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    // Only allow updates if dispatch is in prepared status
    if (dispatch.status !== MaterialDispatchStatus.PREPARED) {
      throw new BadRequestException(`Cannot update dispatch with status ${dispatch.status}`);
    }

    return this.materialDispatchRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Update dispatch status
   */
  async updateStatus(
    id: string,
    organizationId: string,
    statusDto: UpdateMaterialDispatchStatusDto,
    updatedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(dispatch.status, statusDto.status);

    const updateData: Record<string, unknown> = {
      status: statusDto.status,
      updatedBy,
    };

    // Set dates based on status
    if (statusDto.status === MaterialDispatchStatus.IN_TRANSIT) {
      updateData.dispatchDate = statusDto.dispatchDate
        ? new Date(statusDto.dispatchDate)
        : new Date();
    }

    if (statusDto.status === MaterialDispatchStatus.DELIVERED) {
      updateData.actualDeliveryDate = statusDto.actualDeliveryDate
        ? new Date(statusDto.actualDeliveryDate)
        : new Date();
      updateData.receivedBy = statusDto.receivedById;
    }

    if (statusDto.notes) {
      updateData.notes = `${dispatch.notes || ''}\n${statusDto.notes}`;
    }

    return this.materialDispatchRepository.update(id, organizationId, updateData);
  }

  /**
   * Cancel dispatch
   */
  async cancel(
    id: string,
    organizationId: string,
    reason: string,
    updatedBy: string,
  ): Promise<MaterialDispatchEntity> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    if (dispatch.status === MaterialDispatchStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered dispatch');
    }

    return this.materialDispatchRepository.update(id, organizationId, {
      status: MaterialDispatchStatus.CANCELLED,
      notes: `${dispatch.notes || ''}\nCancelled: ${reason}`,
      updatedBy,
    });
  }

  /**
   * Delete dispatch
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const dispatch = await this.materialDispatchRepository.findById(id, organizationId);

    // Only allow deletion if dispatch is in draft status
    if (dispatch.status !== MaterialDispatchStatus.PREPARED) {
      throw new BadRequestException('Only draft dispatches can be deleted');
    }

    await this.materialDispatchRepository.delete(id, organizationId);
  }

  /**
   * Get dispatch statistics
   */
  async getStatistics(organizationId: string) {
    const countByStatus =
      await this.materialDispatchRepository.countByStatus(organizationId);

    return {
      total: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
      byStatus: countByStatus,
    };
  }

  /**
   * Get in-transit dispatches
   */
  async getInTransitDispatches(organizationId: string): Promise<MaterialDispatchEntity[]> {
    return this.materialDispatchRepository.getInTransitDispatches(organizationId);
  }

  /**
   * Get pending dispatches
   */
  async getPendingDispatches(organizationId: string): Promise<MaterialDispatchEntity[]> {
    return this.materialDispatchRepository.getPendingDispatches(organizationId);
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: MaterialDispatchStatus,
    newStatus: MaterialDispatchStatus,
  ): void {
    const validTransitions: Record<MaterialDispatchStatus, MaterialDispatchStatus[]> = {
      [MaterialDispatchStatus.PREPARED]: [
        MaterialDispatchStatus.DISPATCHED,
        MaterialDispatchStatus.CANCELLED,
      ],
      [MaterialDispatchStatus.DISPATCHED]: [
        MaterialDispatchStatus.IN_TRANSIT,
        MaterialDispatchStatus.CANCELLED,
      ],
      [MaterialDispatchStatus.IN_TRANSIT]: [
        MaterialDispatchStatus.DELIVERED,
        MaterialDispatchStatus.PARTIALLY_DELIVERED,
        MaterialDispatchStatus.CANCELLED,
      ],
      [MaterialDispatchStatus.DELIVERED]: [],
      [MaterialDispatchStatus.PARTIALLY_DELIVERED]: [
        MaterialDispatchStatus.DELIVERED,
        MaterialDispatchStatus.CANCELLED,
      ],
      [MaterialDispatchStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}

