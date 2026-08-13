import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { ApprovalModule } from './modules/approvals/approval.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BomModule } from './modules/bom/bom.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ConsumerModule } from './modules/consumer/consumer.module';
import { CustomerFeedbackModule } from './modules/customer-feedback/customer-feedback.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DiscomsModule } from './modules/discoms/discoms.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FinanceCommonModule } from './modules/finance-common/finance-common.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PaymentApprovalModule } from './modules/payment-approvals/payment-approval.module';
import { LoanFinanceModule } from './modules/loan-finance/loan-finance.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SavedViewsModule } from './modules/saved-views/saved-views.module';
import { SecurityEventsModule } from './modules/security-events/security-events.module';
import { ServiceTicketsModule } from './modules/service-tickets/service-tickets.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
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
    PlatformModule,
    AppConfigModule,
    // Profile modules
    CustomersModule,
    ConsumerModule,
    DiscomsModule,
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
    // The ledger is the only money module.
    //
    // PaymentsModule, PaymentTermsModule and ProjectExpensesModule were
    // unmounted at cutover — leaving them mounted kept the legacy
    // PATCH/DELETE /payments endpoints live, and those unscoped,
    // non-transactional writes are what silently desynced
    // project_payment_terms.paid_amount in the first place. Their code has now
    // been deleted, along with finance-aggregation.service.ts, which was the
    // last thing in the app still reading their tables.
    //
    // The `payments`, `project_payment_terms`, `project_expenses` and
    // `expense_product_links` TABLES are still present and deliberately so:
    // they are the rollback artefact. Nothing reads them. They are dropped by
    // a separate migration once cutover has been green for an agreed period —
    // see docs/plans/2026-08-12-finance-legacy-removal-design.md. Note that
    // scripts/ledger-dry-run.ts reads them by design and goes with them.
    LedgerModule,
    PaymentApprovalModule,
    FinanceModule,
    CommentsModule,
    DocumentsModule,
    IntegrationsModule,
    CustomerFeedbackModule,
    ServiceTicketsModule,
    LoanFinanceModule,
    ComplianceModule,
    AuditModule,
    StorageModule,
    SavedViewsModule,
    ReportsModule,
    AnalyticsModule,
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
