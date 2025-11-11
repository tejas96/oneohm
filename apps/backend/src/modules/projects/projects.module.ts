import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MaterialController,
  MilestoneController,
  ProjectController,
  SurveyController,
} from './controllers';
import {
  ProjectEntity,
  ProjectMaterialEntity,
  ProjectMilestoneEntity,
  SiteSurveyEntity,
} from './entities';
import {
  MaterialRepository,
  MilestoneRepository,
  ProjectRepository,
  SurveyRepository,
} from './repositories';
import { MaterialService, MilestoneService, ProjectService, SurveyService } from './services';
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
    ]),
    OrganizationsModule,
    QuotesModule,
  ],
  controllers: [ProjectController, MilestoneController, SurveyController, MaterialController],
  providers: [
    // Repositories
    ProjectRepository,
    MilestoneRepository,
    SurveyRepository,
    MaterialRepository,
    // Services
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
  ],
  exports: [
    ProjectRepository,
    MilestoneRepository,
    SurveyRepository,
    MaterialRepository,
    ProjectService,
    MilestoneService,
    SurveyService,
    MaterialService,
  ],
})
export class ProjectsModule {}
