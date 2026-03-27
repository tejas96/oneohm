import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MaterialController,
  MilestoneController,
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
  ProjectService,
  ProjectTaskService,
  ProjectTeamService,
  WorkflowEngineService,
  WorkflowStepService,
} from './services';
import { CustomersModule } from '../customers/customers.module';
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
  ],
  controllers: [
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
    MilestoneService,
    MaterialService,
    WorkflowStepService,
    WorkflowEngineService,
    ProjectTaskService,
    ProjectTeamService,
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
    MilestoneService,
    MaterialService,
    WorkflowStepService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectTeamGuard,
  ],
})
export class ProjectsModule {}
