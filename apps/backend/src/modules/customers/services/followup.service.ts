import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FollowupOutcome,
  FollowupPriority,
  FollowupStatus,
  FollowupType,
} from '@tejas96/shared/types';

import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { CompleteFollowupDto } from '../dto/complete-followup.dto';
import { CreateFollowupDto } from '../dto/create-followup.dto';
import { UpdateFollowupDto } from '../dto/update-followup.dto';
import { FollowupEntity } from '../entities/followup.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';

/**
 * Followup Service
 * Business logic for followup management
 */
@Injectable()
export class FollowupService {
  private readonly logger = new Logger(FollowupService.name);

  constructor(
    private readonly followupRepository: FollowupRepository,
    private readonly customerRepository: CustomerProfileRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Create a new followup
   */
  async create(createDto: CreateFollowupDto, createdBy: string): Promise<FollowupEntity> {
    this.logger.log(`Creating followup for customer: ${createDto.customerId}`);

    // Validate customer exists
    const customer = await this.customerRepository.findById(createDto.customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Validate property if provided
    if (createDto.propertyId) {
      const property = await this.propertyRepository.findById(createDto.propertyId);
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      // Ensure property belongs to the customer
      if (property.customerId !== createDto.customerId) {
        throw new BadRequestException('Property does not belong to this customer');
      }
    }

    // Validate assigned user has a role
    const userRoles = await this.userRoleRepository.findByUserAndOrganization(
      createDto.assignedToUserId,
    );
    if (userRoles.length === 0) {
      throw new BadRequestException('Assigned user not found');
    }

    const followup = await this.followupRepository.create({
      ...createDto,
      scheduledAt: new Date(createDto.scheduledAt),
      createdBy,
    });

    this.logger.log(`Followup created: ${followup.id}`);
    return followup;
  }

  /**
   * Find all followups
   */
  async findAll(page = 1, limit = 20): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findAll(page, limit);
    return { data, total };
  }

  /**
   * Find followups with filters
   */
  async findWithFilters(
    filters: {
      status?: FollowupStatus;
      assignedToUserId?: string;
      customerId?: string;
      propertyId?: string;
      priority?: string;
      from?: string;
      to?: string;
    },
    page = 1,
    limit = 20,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const parsedFilters = {
      ...filters,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    };

    const [data, total] = await this.followupRepository.findWithFilters(parsedFilters, page, limit);
    return { data, total };
  }

  /**
   * Find followups assigned to current user
   */
  async findMyFollowups(
    userId: string,
    status?: FollowupStatus,
    page = 1,
    limit = 20,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findByAssignedUser(
      userId,
      status,
      page,
      limit,
    );
    return { data, total };
  }

  /**
   * Find today's followups
   */
  async findTodayFollowups(
    userId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findTodayFollowups(userId, page, limit);
    return { data, total };
  }

  /**
   * Find overdue followups
   */
  async findOverdueFollowups(
    userId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findOverdueFollowups(userId, page, limit);
    return { data, total };
  }

  /**
   * Find followup by ID
   */
  async findById(id: string): Promise<FollowupEntity> {
    const followup = await this.followupRepository.findById(id);
    if (!followup) {
      throw new NotFoundException('Followup not found');
    }
    return followup;
  }

  /**
   * Update a followup
   */
  async update(
    id: string,
    updateDto: UpdateFollowupDto,
    updatedBy: string,
  ): Promise<FollowupEntity> {
    this.logger.log(`Updating followup: ${id}`);

    // Verify followup exists and belongs to org
    const existingFollowup = await this.findById(id);

    // If propertyId is being updated, validate it
    if (updateDto.propertyId && updateDto.propertyId !== existingFollowup.propertyId) {
      const property = await this.propertyRepository.findById(updateDto.propertyId);
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      // Ensure property belongs to the customer
      if (property.customerId !== existingFollowup.customerId) {
        throw new BadRequestException('Property does not belong to this customer');
      }
    }

    // Separate scheduledAt from other fields to handle string -> Date conversion
    const { scheduledAt, ...restDto } = updateDto;
    const updates: Partial<FollowupEntity> = {
      ...restDto,
      updatedBy,
    };

    if (scheduledAt) {
      updates.scheduledAt = new Date(scheduledAt);
    }

    const updatedFollowup = await this.followupRepository.update(id, updates);
    if (!updatedFollowup) {
      throw new NotFoundException('Followup not found');
    }

    this.logger.log(`Followup updated: ${id}`);
    return updatedFollowup;
  }

  /**
   * Complete a followup and, unless the lead is closing, open the next one.
   *
   * The next followup is mandatory only when this is the LAST pending followup
   * on the lead unit — that is precisely when completing it would leave the lead
   * with nobody owing it an action. With siblings still pending the rule is
   * already satisfied, and demanding another would make parallel chases absurd:
   * finishing a document chase would insist on a second document chase while the
   * quote-decision followup sits open.
   *
   * The check is made server-side against the database; the client's opinion
   * about how many siblings exist is never trusted.
   */
  async complete(id: string, dto: CompleteFollowupDto, userId: string): Promise<FollowupEntity> {
    const followup = await this.findById(id);

    if (followup.status !== FollowupStatus.PENDING) {
      throw new BadRequestException(`Followup is already ${followup.status}`);
    }

    // Without a catch-all people pick a wrong-but-close outcome to get past the
    // dialog, which corrupts the data more quietly than an honest "other".
    // Requiring notes is what keeps that escape hatch honest.
    if (dto.outcome === FollowupOutcome.OTHER && !dto.notes?.trim()) {
      throw new BadRequestException('Notes are required when the outcome is "other"');
    }

    if (dto.terminal === 'lost' && !dto.lostReason?.trim()) {
      throw new BadRequestException('A reason is required when marking a lead lost');
    }

    const propertyId = followup.propertyId ?? null;

    if (!dto.terminal && !dto.next) {
      const siblings = await this.followupRepository.countPendingForUnit(
        followup.customerId,
        propertyId,
        id,
      );
      if (siblings === 0) {
        throw new BadRequestException(
          'This is the only open follow-up. Schedule the next one, or close the lead as won or lost.',
        );
      }
    }

    return this.followupRepository.repository.manager.transaction(async (manager) => {
      const completed = await this.followupRepository.update(
        id,
        {
          status: FollowupStatus.COMPLETED,
          outcome: dto.outcome,
          completedAt: new Date(),
          notes: dto.notes?.trim() || followup.notes,
          updatedBy: userId,
        },
        manager,
      );
      if (!completed) {
        throw new NotFoundException('Followup not found');
      }

      if (dto.terminal) {
        await this.followupRepository.cancelPendingFor(
          followup.customerId,
          propertyId,
          userId,
          manager,
        );
        if (dto.terminal === 'lost') {
          if (propertyId) {
            await this.propertyRepository.markLost(propertyId, dto.lostReason!, userId, manager);
          } else {
            await this.customerRepository.markLost(
              followup.customerId,
              dto.lostReason!,
              userId,
              manager,
            );
          }
        }
        return completed;
      }

      if (dto.next) {
        await this.followupRepository.create(
          {
            customerId: followup.customerId,
            propertyId: propertyId ?? undefined,
            type: dto.next.type ?? FollowupType.TASK,
            subject: dto.next.subject.trim(),
            scheduledAt: new Date(dto.next.scheduledAt),
            assignedToUserId: dto.next.assignedToUserId,
            priority: dto.next.priority ?? FollowupPriority.NORMAL,
            notes: dto.next.notes,
            status: FollowupStatus.PENDING,
            createdBy: userId,
          },
          manager,
        );
      }

      return completed;
    });
  }

  /**
   * Mark followup as completed
   */
  async markAsCompleted(id: string, updatedBy: string): Promise<FollowupEntity> {
    this.logger.log(`Marking followup as completed: ${id}`);

    const existingFollowup = await this.findById(id);

    // Check if already in a final state
    if (existingFollowup.status === FollowupStatus.COMPLETED) {
      throw new BadRequestException('Followup is already completed');
    }
    if (existingFollowup.status === FollowupStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled followup');
    }

    const updatedFollowup = await this.followupRepository.update(id, {
      status: FollowupStatus.COMPLETED,
      updatedBy,
    });

    if (!updatedFollowup) {
      throw new NotFoundException('Followup not found');
    }

    this.logger.log(`Followup completed: ${id}`);
    return updatedFollowup;
  }

  /**
   * Mark followup as cancelled
   */
  async markAsCancelled(id: string, updatedBy: string): Promise<FollowupEntity> {
    this.logger.log(`Marking followup as cancelled: ${id}`);

    const existingFollowup = await this.findById(id);

    // Check if already in a final state
    if (existingFollowup.status === FollowupStatus.CANCELLED) {
      throw new BadRequestException('Followup is already cancelled');
    }
    if (existingFollowup.status === FollowupStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed followup');
    }

    const updatedFollowup = await this.followupRepository.update(id, {
      status: FollowupStatus.CANCELLED,
      updatedBy,
    });

    if (!updatedFollowup) {
      throw new NotFoundException('Followup not found');
    }

    this.logger.log(`Followup cancelled: ${id}`);
    return updatedFollowup;
  }

  /**
   * Soft delete a followup
   */
  async delete(id: string, deletedBy: string): Promise<void> {
    this.logger.log(`Deleting followup: ${id}`);

    await this.findById(id);

    const deleted = await this.followupRepository.softDelete(id, deletedBy);
    if (!deleted) {
      throw new NotFoundException('Followup not found');
    }

    this.logger.log(`Followup deleted: ${id}`);
  }
}
