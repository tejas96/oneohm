import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ProjectMaintenanceConfigController,
  MaintenanceTaskController,
  ServiceRequestController,
} from './controllers';
import {
  ProjectMaintenanceConfigEntity,
  MaintenanceTaskEntity,
  ServiceRequestEntity,
} from './entities';
import {
  ProjectMaintenanceConfigRepository,
  MaintenanceTaskRepository,
  ServiceRequestRepository,
} from './repositories';
import {
  ProjectMaintenanceConfigService,
  MaintenanceTaskService,
  ServiceRequestService,
} from './services';
import { CustomersModule } from '../customers/customers.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';

/**
 * Service & Maintenance Module
 * Manages project maintenance configurations, maintenance tasks, and service requests
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectMaintenanceConfigEntity,
      MaintenanceTaskEntity,
      ServiceRequestEntity,
    ]),
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    CustomersModule,
  ],
  providers: [
    ProjectMaintenanceConfigRepository,
    MaintenanceTaskRepository,
    ServiceRequestRepository,
    ProjectMaintenanceConfigService,
    MaintenanceTaskService,
    ServiceRequestService,
  ],
  controllers: [
    ProjectMaintenanceConfigController,
    MaintenanceTaskController,
    ServiceRequestController,
  ],
  exports: [
    ProjectMaintenanceConfigService,
    MaintenanceTaskService,
    ServiceRequestService,
    ProjectMaintenanceConfigRepository,
    MaintenanceTaskRepository,
    ServiceRequestRepository,
  ],
})
export class ServiceMaintenanceModule {}

