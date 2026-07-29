import { Module } from '@nestjs/common';

import { ConsumerProjectController } from './controllers/consumer-project.controller';
import { ConsumerPropertyController } from './controllers/consumer-property.controller';
import { ConsumerQuotationController } from './controllers/consumer-quotation.controller';
import { CustomerOwnershipGuard } from './guards';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';
import { DocumentsModule } from '../documents/documents.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ProjectsModule } from '../projects/projects.module';
import { QuotesModule } from '../quotes/quotes.module';

/**
 * Consumer Module
 * Customer-safe /consumer/* API namespace. Reuses CustomersModule services internally.
 */
@Module({
  imports: [
    CustomersModule,
    AuthModule,
    QuotesModule,
    ProjectsModule,
    LedgerModule,
    DocumentsModule,
  ],
  controllers: [ConsumerPropertyController, ConsumerQuotationController, ConsumerProjectController],
  providers: [CustomerOwnershipGuard],
  exports: [CustomerOwnershipGuard],
})
export class ConsumerModule {}
