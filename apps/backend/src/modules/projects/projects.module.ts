import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MaterialController,
  MilestoneController,
  ProjectController,
  ProjectTaskController,
  ProjectTeamController,
  SurveyController,
  TasksController,
  WorkflowStepController,
} from './controllers';
import {
  ProjectEntity,
  ProjectMaterialEntity,
  ProjectMilestoneEntity,
  ProjectTaskEntity,
  ProjectTeamMemberEntity,
  SiteSurveyEntity,
  WorkflowStepEntity,
} from './entities';
import { ProjectTeamGuard } from './guards';
import {
  MaterialRepository,
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  SurveyRepository,
  WorkflowStepRepository,
} from './repositories';
import {
  MaterialService,
  MilestoneService,
  ProjectService,
  ProjectTaskService,
  ProjectTeamService,
  SurveyService,
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
      SiteSurveyEntity,
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
    SurveyController,
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
    SurveyRepository,
    MaterialRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    // Services
    ProjectService,
    MilestoneService,
    SurveyService,
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
    SurveyRepository,
    MaterialRepository,
    WorkflowStepRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
    WorkflowStepService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectTeamGuard,
  ],
})
export class ProjectsModule {}
