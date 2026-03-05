import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';

import { InvitationEntity, InvitationStatus } from '../entities/invitation.entity';

/**
 * Invitation Repository
 * Handles database operations for user invitations
 */
@Injectable()
export class InvitationRepository {
  constructor(
    @InjectRepository(InvitationEntity)
    private readonly repository: Repository<InvitationEntity>,
  ) {}

  /**
   * Create a new invitation
   */
  async create(data: {
    email: string;
    token: string;
    organizationId: string;
    roleId: string;
    expiresAt: Date;
    invitedBy?: string;
  }): Promise<InvitationEntity> {
    const invitation = this.repository.create(data);
    return this.repository.save(invitation);
  }

  /**
   * Find invitation by ID
   */
  async findById(id: string): Promise<InvitationEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['organization', 'role'],
    });
  }

  /**
   * Paginated list of invitations with optional org/status filters
   */
  async findAllPaginated(
    skip: number,
    take: number,
    filters?: { organizationId?: string; status?: InvitationStatus },
  ): Promise<[InvitationEntity[], number]> {
    const where: Record<string, unknown> = {};
    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.repository.findAndCount({
      where,
      relations: ['organization', 'role'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  /**
   * Find invitation by token
   */
  async findByToken(token: string): Promise<InvitationEntity | null> {
    return this.repository.findOne({
      where: { token },
      relations: ['organization', 'role'],
    });
  }

  /**
   * Find invitation by email and organization
   */
  async findByEmailAndOrganization(
    email: string,
    organizationId: string,
  ): Promise<InvitationEntity | null> {
    return this.repository.findOne({
      where: {
        email,
        organizationId,
        status: InvitationStatus.PENDING,
      },
      relations: ['organization', 'role'],
    });
  }

  /**
   * Find all invitations for an organization
   */
  async findByOrganization(
    organizationId: string,
    status?: InvitationStatus,
  ): Promise<InvitationEntity[]> {
    const where: Record<string, unknown> = { organizationId };
    if (status) {
      where.status = status;
    }

    return this.repository.find({
      where,
      relations: ['organization', 'role'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Mark invitation as accepted
   */
  async markAsAccepted(id: string): Promise<void> {
    await this.repository.update(id, {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    });
  }

  /**
   * Mark invitation as expired
   */
  async markAsExpired(id: string): Promise<void> {
    await this.repository.update(id, {
      status: InvitationStatus.EXPIRED,
    });
  }

  /**
   * Mark invitation as cancelled
   */
  async markAsCancelled(id: string): Promise<void> {
    await this.repository.update(id, {
      status: InvitationStatus.CANCELLED,
    });
  }

  /**
   * Mark expired invitations
   * Should be called by a cron job
   */
  async markExpiredInvitations(): Promise<void> {
    await this.repository.update(
      {
        status: InvitationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      {
        status: InvitationStatus.EXPIRED,
      },
    );
  }

  /**
   * Delete invitation
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Cancel pending invitations for email and org (before creating new one)
   */
  async cancelPendingInvitations(email: string, organizationId: string): Promise<void> {
    await this.repository.update(
      {
        email,
        organizationId,
        status: InvitationStatus.PENDING,
      },
      {
        status: InvitationStatus.CANCELLED,
      },
    );
  }
}
