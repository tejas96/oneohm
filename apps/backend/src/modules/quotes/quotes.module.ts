import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteController, QuoteCalculatorController } from './controllers';
import { QuoteEntity, QuoteLineItemEntity, QuoteVersionEntity } from './entities';
import { QuoteLineItemRepository, QuoteRepository, QuoteVersionRepository } from './repositories';
import { QuoteService, QuoteCalculatorService } from './services';
import { MasterDataModule } from '../master-data/master-data.module';
import { OrganizationsModule } from '../organizations/organizations.module';

/**
 * Quotes Module
 * Manages quotes, quotations, versions, line items, and quote calculation
 * Note: ProductRepository and PricingRuleRepository are provided by MasterDataModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteEntity, QuoteVersionEntity, QuoteLineItemEntity]),
    OrganizationsModule, // For organization repository
    MasterDataModule, // For product, pricing, subsidy, installation, quote config repositories
  ],
  controllers: [QuoteController, QuoteCalculatorController],
  providers: [
    QuoteService,
    QuoteRepository,
    QuoteVersionRepository,
    QuoteLineItemRepository,
    QuoteCalculatorService,
  ],
  exports: [QuoteService, QuoteRepository, QuoteCalculatorService],
})
export class QuotesModule {}
