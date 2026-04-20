import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteController, QuoteCalculatorController } from './controllers';
import { QuoteEntity, QuoteVersionEntity } from './entities';
import { QuoteRepository } from './repositories';
import { QuoteService, QuoteCalculatorService } from './services';
import { BomModule } from '../bom/bom.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { OrganizationsModule } from '../organizations/organizations.module';

/**
 * Quotes Module
 * Manages quotes, quotations, versions, and quote calculation
 * Note: ProductRepository and ProductPriceRepository are provided by MasterDataModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteEntity, QuoteVersionEntity]),
    OrganizationsModule,
    MasterDataModule,
    BomModule,
  ],
  controllers: [QuoteController, QuoteCalculatorController],
  providers: [QuoteService, QuoteRepository, QuoteCalculatorService],
  exports: [QuoteService, QuoteRepository, QuoteCalculatorService],
})
export class QuotesModule {}
