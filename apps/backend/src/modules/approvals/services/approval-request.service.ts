import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type StatisticsResponse,
  ApprovalAction,
  ApprovalDecision,
  ApprovalRequestStatus,
  ApprovalRequirementType,
} from '@oneohm-epc/shared-types';

import type { ApprovalActionDto, CreateApprovalRequestDto, UpdateApprovalRequestDto } from '../dto';
import type { ApprovalRequestEntity, ApprovalStageEntity } from '../entities';
import {
  ApprovalHistoryRepository,
  ApprovalRequestRepository,
  ApprovalTemplateRepository,
} from '../repositories';

/**
 * ApprovalRequestService
 * Business logic for approval workflow requests
 */
@Injectable()
export class ApprovalRequestService {
  constructor(
    private readonly requestRepository: ApprovalRequestRepository,
    private readonly templateRepository: ApprovalTemplateRepository,
    private readonly historyRepository: ApprovalHistoryRepository,
  ) {}

  /**
   * Create a new approval request
   */
  async create(
    organizationId: string,
    createDto: CreateApprovalRequestDto,
    requestedBy: string,
  ): Promise<ApprovalRequestEntity> {
    // Validate template exists and is active
    const template = await this.templateRepository.findById(createDto.templateId, organizationId);

    if (!template) {
      throw new NotFoundException('Approval template not found');
    }

    if (!template.isActive) {
      throw new BadRequestException('Approval template is not active');
    }

    // Check if template has stages
    if (!template.stages || template.stages.length === 0) {
      throw new BadRequestException('Template has no approval stages configured');
    }

    // Sort stages by order
    const sortedStages = [...template.stages].sort((a, b) => a.stageOrder - b.stageOrder);
    const firstStage = sortedStages[0];

    if (!firstStage) {
      throw new BadRequestException('Template has no valid stages');
    }

    // Generate request number
    const requestNumber = await this.requestRepository.getNextRequestNumber();

    // Check auto-approval conditions
    if (template.autoApprovalEnabled && template.autoApprovalConditions) {
      const shouldAutoApprove = this.evaluateAutoApprovalConditions(
        template.autoApprovalConditions,
        createDto,
      );

      if (shouldAutoApprove) {
        // Create auto-approved request
        const request = await this.requestRepository.create({
          ...createDto,
          organizationId,
          requestNumber,
          requestedBy,
          status: ApprovalRequestStatus.APPROVED,
          finalStatus: ApprovalRequestStatus.APPROVED,
          completedAt: new Date(),
          createdBy: requestedBy,
          updatedBy: requestedBy,
        });

        // Record auto-approval in history
        await this.historyRepository.create({
          approvalRequestId: request.id,
          action: ApprovalAction.AUTO_APPROVED,
          decision: ApprovalDecision.APPROVED,
          comment: 'Auto-approved based on template conditions',
          actedBy: requestedBy,
          metadata: { autoApprovalConditions: template.autoApprovalConditions },
        });

        return request;
      }
    }

    // Create pending request
    const request = await this.requestRepository.create({
      ...createDto,
      organizationId,
      requestNumber,
      requestedBy,
      currentStageId: firstStage.id,
      currentStageOrder: firstStage.stageOrder,
      status: ApprovalRequestStatus.IN_PROGRESS,
      createdBy: requestedBy,
      updatedBy: requestedBy,
    });

    // Record submission in history
    await this.historyRepository.create({
      approvalRequestId: request.id,
      action: ApprovalAction.SUBMITTED,
      comment: 'Approval request submitted',
      actedBy: requestedBy,
    });

    // TODO: Send notifications to approvers (integrate notification service)

    return request;
  }

  /**
   * Process approval/rejection action
   */
  async processAction(
    requestId: string,
    organizationId: string,
    actionDto: ApprovalActionDto,
    actedBy: string,
    actedByRole: string,
  ): Promise<ApprovalRequestEntity> {
    // Get request with full details
    const request = await this.requestRepository.findById(requestId, organizationId);

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    // Validate request status
    if (request.status !== ApprovalRequestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot process action for request in ${request.status} status`,
      );
    }

    // Validate user is authorized to approve this stage
    const currentStage = request.currentStage;
    if (!currentStage) {
      throw new BadRequestException('Current stage not found');
    }

    // TODO: Implement authorization check
    //     if (!isAuthorized) {
    // TODO: Implement authorization check
    //       throw new BadRequestException('User not authorized to approve this stage');
    // TODO: Implement authorization check
    //     }
    // TODO: Implement authorization check
    //
    // Check if user has already acted on this stage
    const stageHistory = await this.historyRepository.findByStageId(requestId, currentStage.id);

    const hasAlreadyActed = stageHistory.some(
      (h) => h.actedBy === actedBy && h.decision !== undefined,
    );

    if (hasAlreadyActed && !currentStage.allowParallelApproval) {
      throw new BadRequestException('User has already acted on this stage');
    }

    // Record action in history
    await this.historyRepository.create({
      approvalRequestId: requestId,
      stageId: currentStage.id,
      action:
        actionDto.decision === ApprovalDecision.APPROVED
          ? ApprovalAction.APPROVED
          : ApprovalAction.REJECTED,
      decision: actionDto.decision,
      comment: actionDto.comment,
      actedBy,
      actedByRole: actedByRole as any, // Cast to Role type
    });

    // Handle rejection
    if (actionDto.decision === ApprovalDecision.REJECTED) {
      await this.requestRepository.update(requestId, organizationId, {
        status: ApprovalRequestStatus.REJECTED,
        finalStatus: ApprovalRequestStatus.REJECTED,
        finalRejectedBy: actedBy,
        finalComment: actionDto.comment,
        completedAt: new Date(),
        updatedBy: actedBy,
      });

      // TODO: Send rejection notifications

      return this.requestRepository.findById(
        requestId,
        organizationId,
      ) as Promise<ApprovalRequestEntity>;
    }

    // Handle approval - check if stage requirements are met
    const stageFulfilled = await this.isStageRequirementFulfilled(requestId, currentStage);

    if (!stageFulfilled) {
      // More approvals needed for this stage
      return this.requestRepository.findById(
        requestId,
        organizationId,
      ) as Promise<ApprovalRequestEntity>;
    }

    // Stage is fulfilled, move to next stage or complete
    const sortedStages = [...request.template.stages].sort((a, b) => a.stageOrder - b.stageOrder);
    const currentStageIndex = sortedStages.findIndex((s) => s.id === currentStage.id);
    const nextStage = sortedStages[currentStageIndex + 1];

    if (!nextStage) {
      // All stages completed - approve request
      await this.requestRepository.update(requestId, organizationId, {
        status: ApprovalRequestStatus.APPROVED,
        finalStatus: ApprovalRequestStatus.APPROVED,
        finalApprovedBy: actedBy,
        completedAt: new Date(),
        updatedBy: actedBy,
      });

      // TODO: Send approval completion notifications

      return this.requestRepository.findById(
        requestId,
        organizationId,
      ) as Promise<ApprovalRequestEntity>;
    }

    // Move to next stage
    await this.requestRepository.update(requestId, organizationId, {
      currentStageId: nextStage.id,
      currentStageOrder: nextStage.stageOrder,
      updatedBy: actedBy,
    });

    // TODO: Send notifications to next stage approvers

    return this.requestRepository.findById(
      requestId,
      organizationId,
    ) as Promise<ApprovalRequestEntity>;
  }

  /**
   * Find all requests
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ApprovalRequestStatus;
      referenceType?: string;
      templateId?: string;
      requestedBy?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ requests: ApprovalRequestEntity[]; total: number }> {
    return this.requestRepository.findAll(organizationId, page, limit, filters);
  }

  /**
   * Find request by ID
   */
  async findById(id: string, organizationId: string): Promise<ApprovalRequestEntity> {
    const request = await this.requestRepository.findById(id, organizationId);

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    return request;
  }

  /**
   * Find requests by reference
   */
  async findByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<ApprovalRequestEntity[]> {
    return this.requestRepository.findByReference(referenceType, referenceId);
  }

  /**
   * Find pending requests for a user
   */
  async findPendingForUser(
    userId: string,
    organizationId: string,
  ): Promise<ApprovalRequestEntity[]> {
    return this.requestRepository.findPendingForUser(userId, organizationId);
  }

  /**
   * Update request
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateApprovalRequestDto,
    updatedBy: string,
  ): Promise<ApprovalRequestEntity> {
    await this.findById(id, organizationId);

    return this.requestRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Cancel request
   */
  async cancel(
    id: string,
    organizationId: string,
    cancelledBy: string,
    reason?: string,
  ): Promise<ApprovalRequestEntity> {
    const request = await this.findById(id, organizationId);

    if (
      request.status === ApprovalRequestStatus.APPROVED ||
      request.status === ApprovalRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Cannot cancel a completed request');
    }

    await this.requestRepository.update(id, organizationId, {
      status: ApprovalRequestStatus.CANCELLED,
      finalStatus: ApprovalRequestStatus.CANCELLED,
      finalComment: reason,
      completedAt: new Date(),
      updatedBy: cancelledBy,
    });

    // Record cancellation in history
    await this.historyRepository.create({
      approvalRequestId: id,
      action: ApprovalAction.CANCELLED,
      comment: reason ?? 'Request cancelled',
      actedBy: cancelledBy,
    });

    return this.requestRepository.findById(id, organizationId) as Promise<ApprovalRequestEntity>;
  }

  /**
   * Get statistics
   */
  async getStatistics(organizationId: string): Promise<StatisticsResponse<ApprovalRequestStatus>> {
    const byStatus = await this.requestRepository.countByStatus(organizationId);

    return {
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      byStatus,
    };
  }

  /**
   * Get pending count
   */
  async getPendingCount(organizationId: string): Promise<number> {
    return this.requestRepository.countPending(organizationId);
  }

  // ==================== Private Helper Methods ====================

  /**
   * Evaluate auto-approval conditions
   */
  private evaluateAutoApprovalConditions(
    conditions: Record<string, unknown>,
    request: CreateApprovalRequestDto,
  ): boolean {
    // Simple condition evaluation (can be enhanced)
    if (conditions.amount && request.amount) {
      const amountCondition = conditions.amount as Record<string, number>;
      if (amountCondition.lessThan && request.amount >= amountCondition.lessThan) {
        return false;
      }
      if (amountCondition.greaterThan && request.amount <= amountCondition.greaterThan) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user is authorized to approve a stage
   */
  private isUserAuthorizedForStage(userId: string, userRole: string, stage: any): boolean {
    // Role-based authorization
    if (stage.approverRoles?.includes(userRole)) {
      return true;
    }

    // User-based authorization
    if (stage.approverUserIds?.includes(userId)) {
      return true;
    }

    // TODO: Implement dynamic approver rules

    return false;
  }

  /**
   * Check if stage approval requirements are fulfilled
   */
  private async isStageRequirementFulfilled(
    requestId: string,
    stage: ApprovalStageEntity,
  ): Promise<boolean> {
    const stageHistory = await this.historyRepository.findByStageId(requestId, stage.id);

    const approvalCount = stageHistory.filter(
      (h) => h.decision === ApprovalDecision.APPROVED,
    ).length;

    switch (stage.approvalRequirementType) {
      case ApprovalRequirementType.ANY:
        return approvalCount >= 1;

      case ApprovalRequirementType.ALL:
        return approvalCount >= (stage.approverUserIds?.length ?? 1);

      case ApprovalRequirementType.COUNT:
        return approvalCount >= (stage.requiredApprovalsCount ?? 1);

      case ApprovalRequirementType.MAJORITY:
        return approvalCount > (stage.approverUserIds?.length ?? 2) / 2;

      default:
        return approvalCount >= 1;
    }
  }
}
