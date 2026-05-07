import { Module } from '@nestjs/common';

import { FinanceController } from './controllers/finance.controller';
import { FinanceAggregationService } from './services/finance-aggregation.service';

/**
 * FinanceModule
 *
 * Org-wide read-only aggregations for the Finance UI module
 * (Dashboard, Receipts ledger, Expenses ledger, Outstanding, Customer AR,
 * Vendor spend, Project profitability). Mutations remain on existing
 * per-project endpoints.
 *
 * Uses the global TypeORM DataSource directly (no new repositories) since
 * every method is a single SQL pass over existing tables.
 */
@Module({
  controllers: [FinanceController],
  providers: [FinanceAggregationService],
  exports: [FinanceAggregationService],
})
export class FinanceModule {}
