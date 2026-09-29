import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteController, QuoteCalculatorController } from './controllers';
import { QuoteEntity, QuoteVersionEntity } from './entities';
import { QuoteRepository } from './repositories';
import { QuoteService, QuoteCalculatorService } from './services';
import { AuditModule } from '../audit/audit.module';
import { CustomersModule } from '../customers/customers.module';
import { DocumentsModule } from '../documents/documents.module';
import { CommissionBirthModule } from '../employees/commissions/commission-birth.module';
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
    CommissionBirthModule,
    IntegrationsModule,
    StorageModule,
    AuditModule,
    forwardRef(() => CustomersModule),
    forwardRef(() => InventoryModule),
  ],
  controllers: [QuoteController, QuoteCalculatorController],
  providers: [QuoteService, QuoteRepository, QuoteCalculatorService],
  exports: [QuoteService, QuoteRepository, QuoteCalculatorService],
})
export class QuotesModule {}
