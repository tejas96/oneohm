import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FollowupOutcome,
  FollowupPriority,
  FollowupStatus,
  FollowupType,
  LossReason,
} from '@tejas96/shared/types';

import { LeadClosureService } from './lead-closure.service';
import { ResellerContextService } from '../../../common/reseller';
import {
  FollowupAssignedEvent,
  FollowupsReassignedEvent,
  STAFF_EVENTS,
} from '../../notifications/events/staff-notification.events';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { CompleteFollowupDto } from '../dto/complete-followup.dto';
import { CreateFollowupDto } from '../dto/create-followup.dto';
import { UpdateFollowupDto } from '../dto/update-followup.dto';
import { FollowupEntity } from '../entities/followup.entity';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository, type FollowupGapRow } from '../repositories/followup.repository';

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
    private readonly leadClosureService: LeadClosureService,
    private readonly resellerContext: ResellerContextService,
    private readonly eventEmitter: EventEmitter2,
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

    await this.resellerContext.assertAssignableUser(
      createDto.assignedToUserId,
      createDto.customerId,
    );

    const followup = await this.followupRepository.create({
      ...createDto,
      scheduledAt: new Date(createDto.scheduledAt),
      createdBy,
    });

    this.logger.log(`Followup created: ${followup.id}`);
    this.emitAssigned(followup.id, followup.assignedToUserId, createdBy);
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
      resellerId?: string;
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
    resellerId?: string,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findByAssignedUser(
      userId,
      status,
      page,
      limit,
      resellerId,
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
    resellerId?: string,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findTodayFollowups(
      userId,
      page,
      limit,
      resellerId,
    );
    return { data, total };
  }

  /**
   * Find overdue followups
   */
  async findOverdueFollowups(
    userId?: string,
    page = 1,
    limit = 20,
    resellerId?: string,
  ): Promise<{ data: FollowupEntity[]; total: number }> {
    const [data, total] = await this.followupRepository.findOverdueFollowups(
      userId,
      page,
      limit,
      resellerId,
    );
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

    // A followup's customer is fixed at creation and never moves. No client
    // (web or mobile) ever sends a changed customerId on this route — this
    // DTO only inherited the field via `PartialType(CreateFollowupDto)`. Left
    // open, it would let anyone re-parent a followup onto another customer
    // and, worse for a reseller, read that other customer's name/phone off
    // the response (found in the reseller-commissions security review).
    if (updateDto.customerId && updateDto.customerId !== existingFollowup.customerId) {
      throw new BadRequestException('A follow-up cannot move to another customer.');
    }

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

    if (updateDto.assignedToUserId !== undefined) {
      await this.resellerContext.assertAssignableUser(
        updateDto.assignedToUserId,
        existingFollowup.customerId,
      );
    }

    // Separate scheduledAt from other fields to handle string -> Date
    // conversion. customerId is dropped unconditionally (immutable on this
    // route, and already rejected above when it would actually change).
    const { scheduledAt, customerId: customerIdIgnored, ...restDto } = updateDto;
    void customerIdIgnored;
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
    if (
      updateDto.assignedToUserId &&
      updateDto.assignedToUserId !== existingFollowup.assignedToUserId
    ) {
      this.emitAssigned(id, updateDto.assignedToUserId, updatedBy);
    }
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

    // Set inside the transaction, announced only once it has committed.
    let nextFollowup = null as FollowupEntity | null;
    const result = await this.followupRepository.repository.manager.transaction(async (manager) => {
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

      // Every terminal path goes through LeadClosureService so this and quote
      // acceptance cannot drift apart on what "closing a lead" means.
      if (dto.terminal) {
        if (dto.terminal === 'lost') {
          if (propertyId) {
            await this.leadClosureService.markPropertyLost(
              propertyId,
              followup.customerId,
              dto.lostReason!,
              // This dialog has no picklist yet — same free-text-only state
              // the mobile mark-lost screen is in until it ships one.
              LossReason.OTHER,
              userId,
              manager,
            );
          } else {
            await this.leadClosureService.markCustomerLost(
              followup.customerId,
              dto.lostReason!,
              LossReason.OTHER,
              userId,
            );
          }
        } else {
          await this.leadClosureService.closeProperty(
            propertyId!,
            followup.customerId,
            userId,
            manager,
          );
        }
        return completed;
      }

      if (dto.next) {
        nextFollowup = await this.followupRepository.create(
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
    if (nextFollowup) {
      this.emitAssigned(nextFollowup.id, nextFollowup.assignedToUserId, userId);
    }
    return result;
  }

  /**
   * Move a followup to a different owner.
   *
   * Ownership of a lead IS the assignee of its pending followup, so this is how
   * a lead changes hands — there is no separate owner field to keep in sync.
   * Deliberately unrestricted: no RBAC in this feature.
   */
  async reassign(id: string, assignedToUserId: string, userId: string): Promise<FollowupEntity> {
    const followup = await this.findById(id);
    await this.assertUserExists(assignedToUserId);
    await this.resellerContext.assertAssignableUser(assignedToUserId, followup.customerId);

    const updated = await this.followupRepository.update(id, {
      assignedToUserId,
      updatedBy: userId,
    });
    if (!updated) {
      throw new NotFoundException('Followup not found');
    }
    if (followup.assignedToUserId !== assignedToUserId) {
      this.emitAssigned(id, assignedToUserId, userId);
    }
    return updated;
  }

  /** Bulk variant for the handoff case — one person going on leave. */
  async reassignMany(
    ids: string[],
    assignedToUserId: string,
    userId: string,
  ): Promise<{ updated: number }> {
    await this.assertUserExists(assignedToUserId);

    // Validate every affected follow-up before writing any of them — fail the
    // whole batch on the first violation rather than leaving it half-applied.
    const moved: string[] = [];
    for (const id of ids) {
      const followup = await this.followupRepository.findById(id);
      if (followup) {
        await this.resellerContext.assertAssignableUser(assignedToUserId, followup.customerId);
        if (followup.assignedToUserId !== assignedToUserId) moved.push(id);
      }
    }

    let updated = 0;
    for (const id of ids) {
      const result = await this.followupRepository.update(id, {
        assignedToUserId,
        updatedBy: userId,
      });
      if (result) updated += 1;
    }

    this.logger.log(`Reassigned ${updated} followup(s) to ${assignedToUserId}`);
    if (moved.length > 0) {
      this.eventEmitter.emit(
        STAFF_EVENTS.FOLLOWUPS_REASSIGNED,
        new FollowupsReassignedEvent(moved, assignedToUserId, userId),
      );
    }
    return { updated };
  }

  /**
   * Move the date without completing.
   *
   * The escape valve that stops people cancelling followups purely to get them
   * off today's list — "he asked me to call Monday instead" is a reschedule,
   * not an outcome.
   */
  async reschedule(id: string, scheduledAt: string, userId: string): Promise<FollowupEntity> {
    const followup = await this.findById(id);
    if (followup.status !== FollowupStatus.PENDING) {
      throw new BadRequestException(`Cannot reschedule a ${followup.status} followup`);
    }

    const updated = await this.followupRepository.update(id, {
      scheduledAt: new Date(scheduledAt),
      updatedBy: userId,
    });
    if (!updated) {
      throw new NotFoundException('Followup not found');
    }
    return updated;
  }

  /** Open lead units with nobody owing them an action. */
  async gaps(resellerId?: string): Promise<FollowupGapRow[]> {
    return this.followupRepository.findGaps(resellerId);
  }

  /** Badge counts. Pass null for everyone's followups. */
  async summary(
    userId: string | null,
    resellerId?: string,
  ): Promise<{
    overdue: number;
    today: number;
    upcoming: number;
    gaps: number;
  }> {
    const [counts, gapRows] = await Promise.all([
      this.followupRepository.summaryCounts(userId, resellerId),
      this.followupRepository.findGaps(resellerId),
    ]);

    // Gaps must respect the same scope as the date buckets. Counting all of
    // them while the list filters to one user leaves the badge and the list
    // disagreeing, which is exactly the kind of thing that makes people stop
    // believing the numbers.
    const gaps = userId
      ? gapRows.filter((row) => row.attributedUserId === userId).length
      : gapRows.length;

    return { ...counts, gaps };
  }

  /**
   * The assigned user must exist in the system.
   *
   * `findByUserAndOrganization` is an org-era name that now just checks the user
   * has any role. Left alone because it has 10 callers across unrelated modules.
   */
  private async assertUserExists(userId: string): Promise<void> {
    const roles = await this.userRoleRepository.findByUserAndOrganization(userId);
    if (roles.length === 0) {
      throw new BadRequestException('Assigned user not found');
    }
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

  /** Tell the new owner. Call only after the write has committed. */
  private emitAssigned(followupId: string, assigneeUserId: string, actorUserId: string): void {
    this.eventEmitter.emit(
      STAFF_EVENTS.FOLLOWUP_ASSIGNED,
      new FollowupAssignedEvent(followupId, assigneeUserId, actorUserId),
    );
  }
}
