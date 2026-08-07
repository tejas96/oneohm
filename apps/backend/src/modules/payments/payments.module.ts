import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentController } from './controllers/payment.controller';
import { ReceiptController } from './controllers/receipt.controller';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentService } from './services/payment.service';
import { ReceiptService } from './services/receipt.service';
import { CustomersModule } from '../customers/customers.module';
import { FinanceCommonModule } from '../finance-common/finance-common.module';
import { PaymentTermsModule } from '../payment-terms/payment-terms.module';
import { ProjectsModule } from '../projects/projects.module';

/**
 * PaymentsModule
 *
 * Owns the receipts ledger (table `payments`, semantically Receipt). Exposes
 * two controllers:
 *   - ReceiptController on `/receipts/*` — the preferred surface, runs
 *     transactional create/FSM/delete with term FOR UPDATE locks and
 *     re-aggregation via the payment-terms repository.
 *   - PaymentController on `/payments/*` — permanent alias kept for legacy
 *     integrations. Marked @Deprecated in OpenAPI; not slated for removal.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    ProjectsModule,
    CustomersModule,
    PaymentTermsModule,
    FinanceCommonModule,
  ],
  controllers: [PaymentController, ReceiptController],
  providers: [PaymentRepository, PaymentService, ReceiptService],
  exports: [PaymentRepository, PaymentService, ReceiptService],
})
export class PaymentsModule {}
