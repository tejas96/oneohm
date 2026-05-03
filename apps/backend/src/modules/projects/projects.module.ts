import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MaterialController,
  ProjectAttentionController,
  MilestoneController,
  ProjectAnalyticsController,
  ProjectController,
  ProjectTaskController,
  ProjectTeamController,
  TasksController,
  WorkflowStepController,
} from './controllers';
import {
  ProjectEntity,
  ProjectMaterialEntity,
  ProjectMilestoneEntity,
  ProjectTaskEntity,
  ProjectTeamMemberEntity,
  WorkflowStepEntity,
} from './entities';
import { ProjectTeamGuard } from './guards';
import {
  MaterialRepository,
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  WorkflowStepRepository,
} from './repositories';
import {
  MaterialService,
  MilestoneService,
  ProjectAttentionService,
  ProjectAnalyticsService,
  ProjectService,
  ProjectTaskService,
  ProjectTeamService,
  WorkflowEngineService,
  WorkflowStepService,
} from './services';
import { BomModule } from '../bom/bom.module';
import { CustomersModule } from '../customers/customers.module';
import { LookupsModule } from '../lookups/lookups.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QuotesModule } from '../quotes/quotes.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProjectMilestoneEntity,
      ProjectMaterialEntity,
      WorkflowStepEntity,
      ProjectTaskEntity,
      ProjectTeamMemberEntity,
    ]),
    OrganizationsModule,
    QuotesModule,
    CustomersModule,
    UsersModule,
    LookupsModule,
    BomModule,
  ],
  controllers: [
    ProjectAnalyticsController, // registered before ProjectController — static 'analytics' segments resolve first
    ProjectAttentionController, // static ':id/attention' should resolve before generic ':id' routes
    ProjectController,
    MilestoneController,
    MaterialController,
    WorkflowStepController,
    ProjectTaskController,
    ProjectTeamController,
    TasksController,
  ],
  providers: [
    // Repositories
    ProjectRepository,
    MilestoneRepository,
    MaterialRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    // Services
    ProjectService,
    ProjectAttentionService,
    MilestoneService,
    MaterialService,
    WorkflowStepService,
    WorkflowEngineService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectAnalyticsService,
    // Guards
    ProjectTeamGuard,
  ],
  exports: [
    ProjectRepository,
    MilestoneRepository,
    MaterialRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectService,
    ProjectAttentionService,
    MilestoneService,
    MaterialService,
    WorkflowStepService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectAnalyticsService,
    ProjectTeamGuard,
  ],
})
export class ProjectsModule {}
