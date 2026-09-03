import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
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
  ProjectTaskEntity,
  ProjectTeamMemberEntity,
  ProjectChatMessageEntity,
  WorkflowStepEntity,
} from './entities';
import { ProjectTeamGuard } from './guards';
import {
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  ProjectChatRepository,
  WorkflowStepRepository,
} from './repositories';
import {
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
import { QuotesModule } from '../quotes/quotes.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      WorkflowStepEntity,
      ProjectTaskEntity,
      ProjectTeamMemberEntity,
      ProjectChatMessageEntity,
    ]),
    QuotesModule,
    CustomersModule,
    UsersModule,
    BomModule,
    forwardRef(() => LedgerModule),
  ],
  controllers: [
    ProjectAnalyticsController, // registered before ProjectController — static 'analytics' segments resolve first
    ProjectAttentionController, // static ':id/attention' should resolve before generic ':id' routes
    ProjectController,
    WorkflowStepController,
    ProjectTaskController,
    ProjectTeamController,
    ProjectChatController,
    TasksController,
  ],
  providers: [
    // Repositories
    ProjectRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectChatRepository,
    // Services
    ProjectService,
    ProjectAttentionService,
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
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectChatRepository,
    ProjectService,
    ProjectAttentionService,
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
