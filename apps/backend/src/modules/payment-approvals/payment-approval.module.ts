import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PendingLedgerEntryEntity } from './entities';

/**
 * Verification in front of every ledger write.
 *
 * Depends on LedgerModule for `LedgerWriteService` — approval is the only thing
 * that calls it now — and on FinanceCommonModule for the request numbering.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PendingLedgerEntryEntity]),
    LedgerModule,
    FinanceCommonModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class PaymentApprovalModule {}
