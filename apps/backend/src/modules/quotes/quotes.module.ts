import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteController, QuoteCalculatorController } from './controllers';
import { QuoteEntity, QuoteVersionEntity } from './entities';
import { QuoteRepository } from './repositories';
import { QuoteService, QuoteCalculatorService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { DocumentsModule } from '../documents/documents.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { StorageModule } from '../storage/storage.module';

/**
 * Quotes Module
 * Manages quotes, quotations, versions, and quote calculation.
 * forwardRef(() => InventoryModule) breaks the Inventory → Quotes → Inventory cycle.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteEntity, QuoteVersionEntity]),
    MasterDataModule,
    DocumentsModule,
    IntegrationsModule,
    StorageModule,
    forwardRef(() => CustomersModule),
    forwardRef(() => InventoryModule),
  ],
  controllers: [QuoteController, QuoteCalculatorController],
  providers: [QuoteService, QuoteRepository, QuoteCalculatorService],
  exports: [QuoteService, QuoteRepository, QuoteCalculatorService],
})
export class QuotesModule {}
