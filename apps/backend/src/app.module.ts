import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { ApprovalModule } from './modules/approvals/approval.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BomModule } from './modules/bom/bom.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { CustomerFeedbackModule } from './modules/customer-feedback/customer-feedback.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FinanceCommonModule } from './modules/finance-common/finance-common.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LoanFinanceModule } from './modules/loan-finance/loan-finance.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PaymentTermsModule } from './modules/payment-terms/payment-terms.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ResellersModule } from './modules/resellers/resellers.module';
import { SavedViewsModule } from './modules/saved-views/saved-views.module';
import { SecurityEventsModule } from './modules/security-events/security-events.module';
import { ServiceMaintenanceModule } from './modules/service-maintenance/service-maintenance.module';
import { SiteActivitiesModule } from './modules/site-activities/site-activities.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    // Global rate limiting - 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    SecurityEventsModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PlatformModule,
    // Profile modules
    CustomersModule,
    ResellersModule,
    EmployeesModule,
    // Other modules
    MasterDataModule,
    LookupsModule,
    QuotesModule,
    BomModule,
    ProjectsModule,
    InventoryModule,
    NotificationsModule,
    ApprovalModule,
    FinanceCommonModule,
    PaymentTermsModule,
    PaymentsModule,
    CommentsModule,
    DocumentsModule,
    IntegrationsModule,
    ServiceMaintenanceModule,
    CustomerFeedbackModule,
    LoanFinanceModule,
    ComplianceModule,
    AuditModule,
    SiteActivitiesModule,
    StorageModule,
    SavedViewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
