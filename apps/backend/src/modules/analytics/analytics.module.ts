import { Module } from '@nestjs/common';

import { SalesPipelineController } from './domains/sales-pipeline/sales-pipeline.controller';
import { SalesPipelineService } from './domains/sales-pipeline/sales-pipeline.service';

/**
 * Cross-domain analytics module.
 *
 * Structure:
 *   analytics/common/           — shared date windows, trend metrics, SQL helpers
 *   analytics/domains/<name>/   — domain-specific controllers, services, queries
 *
 * Current domains:
 *   - sales-pipeline  →  GET /analytics/sales-pipeline/*
 *
 * Future domains (inventory dashboard, finance KPIs, project analytics) can
 * register here without creating standalone top-level modules.
 */
@Module({
  controllers: [SalesPipelineController],
  providers: [SalesPipelineService],
  exports: [SalesPipelineService],
})
export class AnalyticsModule {}
