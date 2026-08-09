import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { COMPANY } from '@tejas96/shared/constants';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import { DataSource, Repository } from 'typeorm';

import { EmployeeProfileEntity } from '../../employees/entities/employee-profile.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import {
  type CreateServiceTicketDto,
  type ServiceTicketListItemDto,
  type ServiceTicketQueryDto,
  type ServiceTicketResponseDto,
  type ServiceTicketStatsDto,
  type UpdateServiceTicketDto,
  type UpdateTicketStatusDto,
} from '../dto';
import { ServiceTicketEntity, ServiceTicketStatusHistoryEntity } from '../entities';
import { ServiceTicketRepository } from '../repositories';
import { toListItemDto, toResponseDto } from './service-ticket.mapper';

@Injectable()
export class ServiceTicketService {
  constructor(
    private readonly ticketRepository: ServiceTicketRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(EmployeeProfileEntity)
    private readonly employeeRepository: Repository<EmployeeProfileEntity>,
  ) {}

  // ============================================
  // CREATE
  // ============================================

  async create(dto: CreateServiceTicketDto, userId: string): Promise<ServiceTicketEntity> {
    await this.assertProjectBelongsToCustomer(dto.projectId, dto.customerId);
    await this.assertEmployeeExists(dto.assignedToEmployeeId);

    return this.dataSource.transaction(async (manager) => {
      const ticketNumber = await this.ticketRepository.generateTicketNumber(COMPANY.code, manager);

      const ticket = manager.create(ServiceTicketEntity, {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        customerId: dto.customerId,
        projectId: dto.projectId,
        ticketNumber,
        status: ServiceTicketStatus.OPEN,
        assignedToEmployeeId: dto.assignedToEmployeeId ?? null,
        assignedAt: dto.assignedToEmployeeId ? new Date() : null,
        photos: dto.photos ?? null,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await manager.save(ServiceTicketEntity, ticket);

      await manager.save(ServiceTicketStatusHistoryEntity, {
        ticketId: saved.id,
        fromStatus: null,
        toStatus: ServiceTicketStatus.OPEN,
        note: null,
        changedBy: userId,
      });

      return saved;
    });
  }

  /**
   * Projects have no direct customer column — they hang off a property, which
   * belongs to a customer. A ticket pointing at a project the customer does not
   * own would surface under the wrong customer's tab, so this is enforced
   * rather than trusted from the client.
   */
  private async assertProjectBelongsToCustomer(
    projectId: string,
    customerId: string,
  ): Promise<void> {
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.property', 'property')
      .where('project.id = :projectId', { projectId })
      .andWhere('project.deleted_at IS NULL')
      .select(['project.id', 'property.customerId'])
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    if (project.property?.customerId !== customerId) {
      throw new BadRequestException(
        'The selected project does not belong to the selected customer.',
      );
    }
  }

  /**
   * Without this the assigned_to_employee_id foreign key raises a raw driver
   * error and Nest returns a bare 500. Checked up front so an unknown id is a
   * 404 the client can act on.
   */
  private async assertEmployeeExists(employeeId?: string | null): Promise<void> {
    if (!employeeId) return;

    const exists = await this.employeeRepository.countBy({ id: employeeId });
    if (exists === 0) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }
  }

  // ============================================
  // READ
  // ============================================

  async findAll(
    query: ServiceTicketQueryDto,
  ): Promise<{ items: ServiceTicketEntity[]; total: number }> {
    return this.ticketRepository.findPaginated(query);
  }

  async findById(id: string): Promise<ServiceTicketEntity> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Service ticket ${id} not found`);
    }
    return ticket;
  }

  // ============================================
  // UPDATE
  // ============================================

  async update(
    id: string,
    dto: UpdateServiceTicketDto,
    userId: string,
  ): Promise<ServiceTicketEntity> {
    const ticket = await this.findById(id);
    this.assertNotClosed(ticket);
    await this.assertEmployeeExists(dto.assignedToEmployeeId);

    const assigneeChanged =
      dto.assignedToEmployeeId !== undefined &&
      dto.assignedToEmployeeId !== ticket.assignedToEmployeeId;

    await this.dataSource.getRepository(ServiceTicketEntity).update(id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.photos !== undefined ? { photos: dto.photos } : {}),
      ...(dto.assignedToEmployeeId !== undefined
        ? { assignedToEmployeeId: dto.assignedToEmployeeId }
        : {}),
      ...(assigneeChanged && dto.assignedToEmployeeId ? { assignedAt: new Date() } : {}),
      updatedBy: userId,
    });

    return this.findById(id);
  }

  /**
   * Transitions are unrestricted among open / in_progress / resolved — a
   * technician can move a ticket backwards when a fix does not hold. `closed`
   * is the one terminal state.
   */
  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    userId: string,
  ): Promise<ServiceTicketEntity> {
    const ticket = await this.findById(id);
    this.assertNotClosed(ticket);

    if (dto.status === ticket.status) {
      return ticket;
    }

    const note = dto.note?.trim() || null;

    if (dto.status === ServiceTicketStatus.RESOLVED && !note) {
      throw new BadRequestException('A resolution note is required when resolving a ticket.');
    }

    const now = new Date();
    const fromStatus = ticket.status;

    await this.dataSource.transaction(async (manager) => {
      await manager.update(ServiceTicketEntity, id, {
        status: dto.status,
        updatedBy: userId,
        ...(dto.status === ServiceTicketStatus.RESOLVED
          ? { resolvedAt: now, resolutionNote: note }
          : {}),
        ...(dto.status === ServiceTicketStatus.CLOSED ? { closedAt: now } : {}),
      });

      await manager.save(ServiceTicketStatusHistoryEntity, {
        ticketId: id,
        fromStatus,
        toStatus: dto.status,
        note,
        changedBy: userId,
      });
    });

    return this.findById(id);
  }

  async getStats(): Promise<ServiceTicketStatsDto> {
    return this.ticketRepository.getStats();
  }

  // ============================================
  // DELETE
  // ============================================

  async softDelete(id: string): Promise<void> {
    const ticket = await this.findById(id);
    await this.dataSource.getRepository(ServiceTicketEntity).softDelete(ticket.id);
  }

  // ============================================
  // GUARDS
  // ============================================

  /**
   * Closing is one-way and final — the single rule the API enforces on top of
   * otherwise free movement between open, in_progress and resolved.
   */
  protected assertNotClosed(ticket: ServiceTicketEntity): void {
    if (ticket.status === ServiceTicketStatus.CLOSED) {
      throw new ConflictException(
        `Ticket ${ticket.ticketNumber} is closed and can no longer be modified.`,
      );
    }
  }

  // ============================================
  // MAPPING
  // ============================================

  toResponseDto(ticket: ServiceTicketEntity): ServiceTicketResponseDto {
    return toResponseDto(ticket);
  }

  toListItemDto(ticket: ServiceTicketEntity): ServiceTicketListItemDto {
    return toListItemDto(ticket);
  }
}
