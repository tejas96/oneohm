import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApprovalRequestController, ApprovalTemplateController } from './controllers';
import {
  ApprovalHistoryEntity,
  ApprovalRequestEntity,
  ApprovalStageEntity,
  ApprovalTemplateEntity,
} from './entities';
import {
  ApprovalHistoryRepository,
  ApprovalRequestRepository,
  ApprovalTemplateRepository,
} from './repositories';
import { ApprovalRequestService, ApprovalTemplateService } from './services';
import { UsersModule } from '../users/users.module';

/**
 * ApprovalModule
 * Module 7 - Approval Workflows
 *
 * Features:
 * - Multi-level approval workflows
 * - Role-based and user-based approvals
 * - Auto-approval conditions
 * - Escalation handling
 * - Comprehensive audit trail
 * - Integration with POs, Quotes, Projects, etc.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalTemplateEntity,
      ApprovalStageEntity,
      ApprovalRequestEntity,
      ApprovalHistoryEntity,
    ]),
    UsersModule, // For user relations
  ],
  controllers: [ApprovalTemplateController, ApprovalRequestController],
  providers: [
    // Repositories
    ApprovalTemplateRepository,
    ApprovalRequestRepository,
    ApprovalHistoryRepository,

    // Services
    ApprovalTemplateService,
    ApprovalRequestService,
  ],
  exports: [
    // Export repositories for other modules to use
    ApprovalTemplateRepository,
    ApprovalRequestRepository,
    ApprovalHistoryRepository,

    // Export services for other modules to use
    ApprovalTemplateService,
    ApprovalRequestService,
  ],
})
export class ApprovalModule {}
