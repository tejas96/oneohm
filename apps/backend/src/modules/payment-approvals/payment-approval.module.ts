import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentApprovalController } from './controllers';
import { PendingLedgerEntryEntity } from './entities';
import { PaymentApprovalService } from './services';
import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { LedgerModule } from '../ledger/ledger.module';
import { StorageModule } from '../storage/storage.module';

/**
 * Verification in front of every ledger write.
 *
 * Depends on LedgerModule for `LedgerWriteService` — approval is the only thing
 * that calls it now — and on FinanceCommonModule for the request numbering.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PendingLedgerEntryEntity]),
    forwardRef(() => LedgerModule),
    FinanceCommonModule,
    StorageModule,
  ],
  controllers: [PaymentApprovalController],
  providers: [PaymentApprovalService],
  exports: [PaymentApprovalService],
})
export class PaymentApprovalModule {}
