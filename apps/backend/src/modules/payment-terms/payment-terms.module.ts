import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentTermController } from './controllers';
import { PaymentTermEntity } from './entities';
import { PaymentTermRepository } from './repositories';
import { PaymentTermService } from './services';
import { ProjectsModule } from '../projects/projects.module';
import { QuotesModule } from '../quotes/quotes.module';

/**
 * PaymentTermsModule
 *
 * Owns the planned receivables (payment terms) ledger. Exports the service
 * and repository so the receipts module can re-aggregate term paid_amount
 * within its own transaction, and so the projects module can call
 * snapshotFromQuoteVersion during quote→project conversion.
 *
 * forwardRef on ProjectsModule breaks the Projects → PaymentTerms → Projects
 * cycle (projects.service depends on PaymentTermService for snapshotting,
 * payment-terms controller depends on ProjectRepository for org checks).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTermEntity]),
    forwardRef(() => ProjectsModule),
    QuotesModule,
  ],
  controllers: [PaymentTermController],
  providers: [PaymentTermRepository, PaymentTermService],
  exports: [PaymentTermRepository, PaymentTermService],
})
export class PaymentTermsModule {}
