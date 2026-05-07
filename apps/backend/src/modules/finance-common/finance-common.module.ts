import { Module } from '@nestjs/common';

import { SequenceService } from './services/sequence.service';

/**
 * FinanceCommonModule
 *
 * Houses cross-cutting helpers used by the finance subsystem
 * (payment terms, receipts, expenses). Exports `SequenceService` for
 * concurrency-safe FY-scoped numbering of receipts and expenses.
 */
@Module({
  providers: [SequenceService],
  exports: [SequenceService],
})
export class FinanceCommonModule {}
