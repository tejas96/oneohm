import { Module } from '@nestjs/common';

import { FinanceController } from './controllers/finance.controller';
import { FinanceReportingService } from './services/finance-reporting.service';

/**
 * FinanceModule
 *
 * Org-wide read-only reporting for the Finance UI: period KPIs, cash flow, the
 * ledger feed, receivables, outstanding terms and customer AR. Mutations live
 * on the ledger's own endpoints.
 *
 * Every figure is derived from `ledger_entries` and `v_milestone_balance`.
 * `FinanceAggregationService` used to sit beside this one reading the
 * pre-ledger `payments` / `project_payment_terms` / `project_expenses` tables;
 * it was the last thing in the app still doing so, and has been deleted.
 *
 * Uses the global TypeORM DataSource directly (no repositories) since every
 * method is a single SQL pass.
 */
@Module({
  controllers: [FinanceController],
  providers: [FinanceReportingService],
  exports: [FinanceReportingService],
})
export class FinanceModule {}
