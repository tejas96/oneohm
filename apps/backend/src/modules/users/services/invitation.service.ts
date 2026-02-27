import { randomBytes } from 'crypto';

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { ConfigService } from '../../../config/config.service';
import { InvitationEntity, InvitationStatus } from '../entities/invitation.entity';
import { InvitationRepository } from '../repositories/invitation.repository';

/**
 * Invitation Service
 * Manages user invitation lifecycle
 */
@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new invitation
   */
  async createInvitation(data: {
    email: string;
    organizationId: string;
    roleId: string;
    invitedBy?: string;
    expiryDays?: number;
  }): Promise<InvitationEntity> {
    // Cancel any existing pending invitations for this email and org
    await this.invitationRepository.cancelPendingInvitations(data.email, data.organizationId);

    // Generate secure token
    const token = this.generateInvitationToken();

    // Calculate expiry (default 7 days)
    const expiryDays = data.expiryDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create invitation
    const invitation = await this.invitationRepository.create({
      email: data.email,
      token,
      organizationId: data.organizationId,
      roleId: data.roleId,
      expiresAt,
      invitedBy: data.invitedBy,
    });

    this.logger.log(`Invitation created for ${data.email} in org ${data.organizationId}`);

    return invitation;
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<InvitationEntity> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  /**
   * Validate invitation token
   */
  async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    invitation?: InvitationEntity;
    error?: string;
  }> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      return { valid: false, error: 'Invitation not found' };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return {
        valid: false,
        error: `Invitation is ${invitation.status}`,
      };
    }

    if (new Date() > invitation.expiresAt) {
      // Auto-mark as expired
      await this.invitationRepository.markAsExpired(invitation.id);
      return { valid: false, error: 'Invitation has expired' };
    }

    return { valid: true, invitation };
  }

  /**
   * Mark invitation as accepted
   */
  async acceptInvitation(token: string): Promise<InvitationEntity> {
    const validation = await this.validateInvitationToken(token);

    if (!validation.valid || !validation.invitation) {
      throw new BadRequestException(validation.error || 'Invalid invitation');
    }

    await this.invitationRepository.markAsAccepted(validation.invitation.id);

    const updatedInvitation = await this.invitationRepository.findByToken(token);
    if (!updatedInvitation) {
      throw new NotFoundException('Invitation not found after accepting');
    }

    this.logger.log(
      `Invitation accepted for ${updatedInvitation.email} in org ${updatedInvitation.organizationId}`,
    );

    return updatedInvitation;
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(id: string): Promise<void> {
    await this.invitationRepository.markAsCancelled(id);
    this.logger.log(`Invitation ${id} cancelled`);
  }

  /**
   * Get invitations by organization
   */
  async getInvitationsByOrganization(
    organizationId: string,
    status?: InvitationStatus,
  ): Promise<InvitationEntity[]> {
    return this.invitationRepository.findByOrganization(organizationId, status);
  }

  /**
   * Generate invitation link
   */
  generateInvitationLink(token: string): string {
    return `${this.configService.app.frontendUrl}/auth/accept-invitation?token=${token}`;
  }

  /**
   * Generate secure invitation token
   */
  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Mark expired invitations (should be called by cron)
   */
  async markExpiredInvitations(): Promise<void> {
    await this.invitationRepository.markExpiredInvitations();
    this.logger.log('Expired invitations marked');
  }
}
