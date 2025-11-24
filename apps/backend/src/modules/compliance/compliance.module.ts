import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ComplianceApplicationController,
  InspectionController,
  SubsidyApplicationController,
} from './controllers';
import {
  ComplianceApplicationEntity,
  InspectionEntity,
  SubsidyApplicationEntity,
} from './entities';
import {
  ComplianceApplicationRepository,
  InspectionRepository,
  SubsidyApplicationRepository,
} from './repositories';
import {
  ComplianceApplicationService,
  InspectionService,
  SubsidyApplicationService,
} from './services';

/**
 * Compliance & Liaising Module
 *
 * Handles:
 * - Compliance applications with auto-numbering (CA-{YEAR}-{NUMBER})
 * - Inspections with scheduling and results (IN-{YEAR}-{NUMBER})
 * - Subsidy applications with approval workflow (SUB-{YEAR}-{NUMBER})
 * - Government authority interactions
 * - Document submissions and tracking
 * - Approval/rejection workflows
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceApplicationEntity,
      InspectionEntity,
      SubsidyApplicationEntity,
    ]),
  ],
  controllers: [
    ComplianceApplicationController,
    InspectionController,
    SubsidyApplicationController,
  ],
  providers: [
    ComplianceApplicationRepository,
    InspectionRepository,
    SubsidyApplicationRepository,
    ComplianceApplicationService,
    InspectionService,
    SubsidyApplicationService,
  ],
  exports: [ComplianceApplicationService, InspectionService, SubsidyApplicationService],
})
export class ComplianceModule {}
