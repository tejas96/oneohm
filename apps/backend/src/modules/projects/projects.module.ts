import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MaterialController,
  ProjectAttentionController,
  ProjectAnalyticsController,
  ProjectController,
  ProjectTaskController,
  ProjectTeamController,
  ProjectChatController,
  TasksController,
  WorkflowStepController,
} from './controllers';
import {
  ProjectEntity,
  ProjectMaterialEntity,
  ProjectTaskEntity,
  ProjectTeamMemberEntity,
  ProjectChatMessageEntity,
  WorkflowStepEntity,
} from './entities';
import { ProjectTeamGuard } from './guards';
import {
  MaterialRepository,
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  ProjectChatRepository,
  WorkflowStepRepository,
} from './repositories';
import {
  MaterialService,
  ProjectAttentionService,
  ProjectAnalyticsService,
  ProjectService,
  ProjectTaskService,
  ProjectTeamService,
  ProjectChatService,
  WorkflowEngineService,
  WorkflowStepService,
} from './services';
import { BomModule } from '../bom/bom.module';
import { CustomersModule } from '../customers/customers.module';
import { LookupsModule } from '../lookups/lookups.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PaymentTermsModule } from '../payment-terms/payment-terms.module';
import { QuotesModule } from '../quotes/quotes.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProjectMaterialEntity,
      WorkflowStepEntity,
      ProjectTaskEntity,
      ProjectTeamMemberEntity,
      ProjectChatMessageEntity,
    ]),
    OrganizationsModule,
    QuotesModule,
    CustomersModule,
    UsersModule,
    LookupsModule,
    BomModule,
    forwardRef(() => PaymentTermsModule),
  ],
  controllers: [
    ProjectAnalyticsController, // registered before ProjectController — static 'analytics' segments resolve first
    ProjectAttentionController, // static ':id/attention' should resolve before generic ':id' routes
    ProjectController,
    MaterialController,
    WorkflowStepController,
    ProjectTaskController,
    ProjectTeamController,
    ProjectChatController,
    TasksController,
  ],
  providers: [
    // Repositories
    ProjectRepository,
    MaterialRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectChatRepository,
    // Services
    ProjectService,
    ProjectAttentionService,
    MaterialService,
    WorkflowStepService,
    WorkflowEngineService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectChatService,
    ProjectAnalyticsService,
    // Guards
    ProjectTeamGuard,
  ],
  exports: [
    ProjectRepository,
    MaterialRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectChatRepository,
    ProjectService,
    ProjectAttentionService,
    MaterialService,
    WorkflowStepService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectChatService,
    ProjectAnalyticsService,
    ProjectTeamGuard,
  ],
})
export class ProjectsModule {}
