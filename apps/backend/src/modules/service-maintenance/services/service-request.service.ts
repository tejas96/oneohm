import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ServiceRequestStatus } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';


import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  ServiceRequestResponseDto,
} from '../dto';
import { ServiceRequestEntity } from '../entities/service-request.entity';
import { ServiceRequestRepository } from '../repositories/service-request.repository';

/**
 * Service for Service Request Operations
 */
@Injectable()
export class ServiceRequestService {
  constructor(private readonly serviceRequestRepository: ServiceRequestRepository) {}

  /**
   * Create a new service request
   */
  async create(createDto: CreateServiceRequestDto): Promise<ServiceRequestResponseDto> {
    // Generate request number
    const requestNumber = await this.serviceRequestRepository.generateRequestNumber(
      createDto.organizationId,
    );

    const request = await this.serviceRequestRepository.create({
      ...createDto,
      requestNumber,
      requestDate: createDto.requestDate ? new Date(createDto.requestDate) : new Date(),
      scheduledDate: createDto.scheduledDate ? new Date(createDto.scheduledDate) : null,
      completedDate: createDto.completedDate ? new Date(createDto.completedDate) : null,
      assignedAt: createDto.assignedToUserId ? new Date() : null,
    });

    return plainToInstance(ServiceRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all service requests
   */
  async findAll(includeRelations: boolean = false): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer', 'assignedToUser', 'createdByUser', 'updatedByUser']
      : [];
    const requests = await this.serviceRequestRepository.findAll({ relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find request by ID
   */
  async findById(id: string, includeRelations: boolean = false): Promise<ServiceRequestResponseDto> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer', 'assignedToUser', 'createdByUser', 'updatedByUser']
      : [];
    const request = await this.serviceRequestRepository.findById(id, { relations });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    return plainToInstance(ServiceRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find request by request number
   */
  async findByRequestNumber(
    requestNumber: string,
    includeRelations: boolean = false,
  ): Promise<ServiceRequestResponseDto> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer', 'assignedToUser', 'createdByUser', 'updatedByUser']
      : [];
    const request = await this.serviceRequestRepository.findByRequestNumber(requestNumber, {
      relations,
    });

    if (!request) {
      throw new NotFoundException(`Service request with number ${requestNumber} not found`);
    }

    return plainToInstance(ServiceRequestResponseDto, request, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find requests by project
   */
  async findByProject(
    projectId: string,
    includeRelations: boolean = false,
  ): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'customer', 'assignedToUser']
      : [];
    const requests = await this.serviceRequestRepository.findByProject(projectId, { relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find requests by customer
   */
  async findByCustomer(
    customerId: string,
    includeRelations: boolean = false,
  ): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'assignedToUser']
      : [];
    const requests = await this.serviceRequestRepository.findByCustomer(customerId, { relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find requests by assigned user
   */
  async findByAssignedUser(
    userId: string,
    includeRelations: boolean = false,
  ): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer']
      : [];
    const requests = await this.serviceRequestRepository.findByAssignedUser(userId, { relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find requests by status
   */
  async findByStatus(
    status: ServiceRequestStatus,
    includeRelations: boolean = false,
  ): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer', 'assignedToUser']
      : [];
    const requests = await this.serviceRequestRepository.findByStatus(status, { relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find open requests
   */
  async findOpen(includeRelations: boolean = false): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer', 'assignedToUser']
      : [];
    const requests = await this.serviceRequestRepository.findOpen({ relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Find overdue requests
   */
  async findOverdue(includeRelations: boolean = false): Promise<ServiceRequestResponseDto[]> {
    const relations = includeRelations
      ? ['organization', 'project', 'customer', 'assignedToUser']
      : [];
    const requests = await this.serviceRequestRepository.findOverdue({ relations });

    return requests.map((request) =>
      plainToInstance(ServiceRequestResponseDto, request, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Assign request to user
   */
  async assignRequest(id: string, assignedToUserId: string): Promise<ServiceRequestResponseDto> {
    const existing = await this.serviceRequestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    const updated = await this.serviceRequestRepository.update(id, {
      assignedToUserId,
      assignedAt: new Date(),
      status: ServiceRequestStatus.ASSIGNED,
    });

    if (!updated) {
      throw new BadRequestException(`Failed to assign service request ${id}`);
    }

    return plainToInstance(ServiceRequestResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update request
   */
  async update(id: string, updateDto: UpdateServiceRequestDto): Promise<ServiceRequestResponseDto> {
    const existing = await this.serviceRequestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    const updateData: Partial<ServiceRequestEntity> = {
      ...updateDto,
      requestDate: updateDto.requestDate ? new Date(updateDto.requestDate) : undefined,
      scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : undefined,
      completedDate: updateDto.completedDate ? new Date(updateDto.completedDate) : undefined,
    };

    const updated = await this.serviceRequestRepository.update(id, updateData);

    if (!updated) {
      throw new NotFoundException(`Failed to update service request ${id}`);
    }

    return plainToInstance(ServiceRequestResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Resolve request
   */
  async resolveRequest(id: string, resolutionNotes: string): Promise<ServiceRequestResponseDto> {
    const existing = await this.serviceRequestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    const updated = await this.serviceRequestRepository.update(id, {
      status: ServiceRequestStatus.RESOLVED,
      resolutionNotes,
      completedDate: new Date(),
    });

    if (!updated) {
      throw new BadRequestException(`Failed to resolve service request ${id}`);
    }

    return plainToInstance(ServiceRequestResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Close request
   */
  async closeRequest(id: string): Promise<ServiceRequestResponseDto> {
    const existing = await this.serviceRequestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (existing.status !== ServiceRequestStatus.RESOLVED) {
      throw new BadRequestException('Only resolved requests can be closed');
    }

    const updated = await this.serviceRequestRepository.update(id, {
      status: ServiceRequestStatus.CLOSED,
    });

    if (!updated) {
      throw new BadRequestException(`Failed to close service request ${id}`);
    }

    return plainToInstance(ServiceRequestResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete request (soft delete)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.serviceRequestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    const deleted = await this.serviceRequestRepository.softDelete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete service request ${id}`);
    }
  }

  /**
   * Get statistics for organization
   */
  async getStatistics(organizationId: string): Promise<Record<string, unknown>> {
    const [stats, avgRating, openCount] = await Promise.all([
      this.serviceRequestRepository.getStatsByOrganization(organizationId),
      this.serviceRequestRepository.getAverageRating(),
      this.serviceRequestRepository.countOpen(),
    ]);

    return {
      ...stats,
      averageRating: avgRating,
      openCount,
    };
  }

  /**
   * Get average rating
   */
  async getAverageRating(projectId?: string, customerId?: string): Promise<number> {
    return this.serviceRequestRepository.getAverageRating({ projectId, customerId });
  }
}

