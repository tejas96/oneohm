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
  TaskTemplateController,
} from './controllers';
import {
  ProjectEntity,
  ProjectMaterialEntity,
  ProjectMilestoneEntity,
  ProjectTaskEntity,
  ProjectTeamMemberEntity,
  SiteSurveyEntity,
  TaskTemplateEntity,
} from './entities';
import { ProjectTeamGuard } from './guards';
import {
  MaterialRepository,
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  SurveyRepository,
  TaskTemplateRepository,
} from './repositories';
import {
  MaterialService,
  MilestoneService,
  ProjectService,
  ProjectTaskService,
  ProjectTeamService,
  SurveyService,
  TaskTemplateService,
} from './services';
import { CustomersModule } from '../customers/customers.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QuotesModule } from '../quotes/quotes.module';
import { UsersModule } from '../users/users.module';

/**
 * Projects Module
 * Manages solar installation projects, milestones, surveys, and materials
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProjectMilestoneEntity,
      SiteSurveyEntity,
      ProjectMaterialEntity,
      TaskTemplateEntity,
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
    TaskTemplateController,
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
    TaskTemplateRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    // Services
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
    TaskTemplateService,
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
    TaskTemplateRepository,
    ProjectTaskRepository,
    ProjectTeamRepository,
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
    TaskTemplateService,
    ProjectTaskService,
    ProjectTeamService,
    ProjectTeamGuard,
  ],
})
export class ProjectsModule {}
