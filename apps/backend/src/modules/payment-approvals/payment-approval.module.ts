import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentApprovalController } from './controllers';
import { PendingLedgerEntryEntity } from './entities';
import { PaymentApprovalNotifier, PaymentApprovalService } from './services';
import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';
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
    // The bell: waiting → approvers, approved / rejected → the submitter.
    NotificationsModule,
  ],
  controllers: [PaymentApprovalController],
  providers: [PaymentApprovalService, PaymentApprovalNotifier],
  exports: [PaymentApprovalService],
})
export class PaymentApprovalModule {}
