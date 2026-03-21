import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteController, QuoteCalculatorController } from './controllers';
import { QuoteEntity, QuoteVersionEntity } from './entities';
import { QuoteRepository, QuoteVersionRepository } from './repositories';
import { QuoteService, QuoteCalculatorService } from './services';
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
    OrganizationsModule, // For organization repository
    MasterDataModule, // For product, pricing, subsidy, installation, quote config repositories
  ],
  controllers: [QuoteController, QuoteCalculatorController],
  providers: [QuoteService, QuoteRepository, QuoteVersionRepository, QuoteCalculatorService],
  exports: [QuoteService, QuoteRepository, QuoteCalculatorService],
})
export class QuotesModule {}
