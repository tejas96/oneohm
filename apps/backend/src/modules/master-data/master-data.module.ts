import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductCategoryController, ProductController } from './controllers';
import {
  ProductCategoryEntity,
  ProductEntity,
  PricingRuleEntity,
  SubsidyConfiguration,
  InstallationPricing,
  QuoteConfiguration,
} from './entities';
import {
  ProductCategoryRepository,
  ProductRepository,
  PricingRuleRepository,
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from './repositories';
import { ProductCategoryService, ProductService } from './services';

/**
 * Master Data Module
 * Manages product catalog, categories, pricing rules, subsidy configurations,
 * installation pricing, and quote configurations
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductCategoryEntity,
      ProductEntity,
      PricingRuleEntity,
      SubsidyConfiguration,
      InstallationPricing,
      QuoteConfiguration,
    ]),
  ],
  controllers: [ProductCategoryController, ProductController],
  providers: [
    ProductCategoryService,
    ProductCategoryRepository,
    ProductService,
    ProductRepository,
    PricingRuleRepository,
    SubsidyConfigurationRepository,
    InstallationPricingRepository,
    QuoteConfigurationRepository,
  ],
  exports: [
    ProductCategoryService,
    ProductService,
    ProductCategoryRepository,
    ProductRepository,
    PricingRuleRepository,
    SubsidyConfigurationRepository,
    InstallationPricingRepository,
    QuoteConfigurationRepository,
  ],
})
export class MasterDataModule {}
