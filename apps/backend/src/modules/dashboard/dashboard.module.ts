import { Module } from '@nestjs/common';

import { IamModule } from '../iam/iam.module';
import { DashboardController } from './controllers/dashboard.controller';
import { FinanceProvider } from './providers/finance.provider';
import { FollowupsProvider } from './providers/followups.provider';
import { ProjectsProvider } from './providers/projects.provider';
import { ServiceProvider } from './providers/service.provider';
import { WorkflowProvider } from './providers/workflow.provider';
import { DashboardService } from './services/dashboard.service';

/**
 * Reads across many domains and owns none of them.
 *
 * No TypeOrmModule.forFeature here on purpose: every provider aggregates with
 * raw SQL through the shared DataSource. Pulling one row per project through
 * the ORM would be an N+1 across five domains on the first screen after login.
 */
@Module({
  // IamModule only for `getUserPermissions`, which the controller calls on the
  // selector path. The JWT's permission list is a login-time snapshot, and the
  // web app gates the dropdown on the FRESH list from /auth/me — so reading the
  // token here would let the two disagree for the life of an access token.
  imports: [IamModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    WorkflowProvider,
    FollowupsProvider,
    ServiceProvider,
    ProjectsProvider,
    FinanceProvider,
  ],
})
export class DashboardModule {}
