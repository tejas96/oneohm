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
  ChangeRequestTaskService,
} from './services';
import { BomModule } from '../bom/bom.module';
import { CustomersModule } from '../customers/customers.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LookupsModule } from '../lookups/lookups.module';
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
    QuotesModule,
    CustomersModule,
    UsersModule,
    LookupsModule,
    BomModule,
    forwardRef(() => LedgerModule),
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
    ChangeRequestTaskService,
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
    ChangeRequestTaskService,
    ProjectTeamService,
    ProjectChatService,
    ProjectAnalyticsService,
    ProjectTeamGuard,
  ],
})
export class ProjectsModule {}
