import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MaterialController,
  MilestoneController,
  ProjectController,
  ProjectTaskController,
  SurveyController,
  TaskTemplateController,
} from './controllers';
import {
  ProjectEntity,
  ProjectMaterialEntity,
  ProjectMilestoneEntity,
  ProjectTaskEntity,
  SiteSurveyEntity,
  TaskActivityLogEntity,
  TaskTemplateEntity,
  TaskTimeLogEntity,
} from './entities';
import {
  MaterialRepository,
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  SurveyRepository,
  TaskActivityLogRepository,
  TaskTemplateRepository,
  TaskTimeLogRepository,
} from './repositories';
import {
  MaterialService,
  MilestoneService,
  ProjectService,
  ProjectTaskService,
  SurveyService,
  TaskTemplateService,
} from './services';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QuotesModule } from '../quotes/quotes.module';

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
      TaskTimeLogEntity,
      TaskActivityLogEntity,
    ]),
    OrganizationsModule,
    QuotesModule,
  ],
  controllers: [
    ProjectController,
    MilestoneController,
    SurveyController,
    MaterialController,
    TaskTemplateController,
    ProjectTaskController,
  ],
  providers: [
    // Repositories
    ProjectRepository,
    MilestoneRepository,
    SurveyRepository,
    MaterialRepository,
    TaskTemplateRepository,
    ProjectTaskRepository,
    TaskTimeLogRepository,
    TaskActivityLogRepository,
    // Services
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
    TaskTemplateService,
    ProjectTaskService,
  ],
  exports: [
    ProjectRepository,
    MilestoneRepository,
    SurveyRepository,
    MaterialRepository,
    TaskTemplateRepository,
    ProjectTaskRepository,
    TaskTimeLogRepository,
    TaskActivityLogRepository,
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
    TaskTemplateService,
    ProjectTaskService,
  ],
})
export class ProjectsModule {}
