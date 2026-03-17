import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  BrandController,
  InstallationPricingController,
  ProductPriceController,
  ProductController,
  ProductTypeController,
  QuoteConfigurationController,
  SubsidyConfigurationController,
} from './controllers';
import {
  ProductTypeEntity,
  ProductTypeAttributeEntity,
  BrandEntity,
  BrandProductTypeEntity,
  ProductEntity,
  ProductPriceEntity,
  SubsidyConfiguration,
  InstallationPricing,
  QuoteConfiguration,
} from './entities';
import {
  ProductTypeRepository,
  BrandRepository,
  BrandProductTypeRepository,
  ProductRepository,
  ProductPriceRepository,
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from './repositories';
import {
  BrandService,
  InstallationPricingService,
  ProductPriceService,
  ProductService,
  ProductTypeService,
  QuoteConfigurationService,
  SubsidyConfigurationService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductTypeEntity,
      ProductTypeAttributeEntity,
      BrandEntity,
      BrandProductTypeEntity,
      ProductEntity,
      ProductPriceEntity,
      SubsidyConfiguration,
      InstallationPricing,
      QuoteConfiguration,
    ]),
  ],
  controllers: [
    ProductTypeController,
    BrandController,
    ProductController,
    InstallationPricingController,
    QuoteConfigurationController,
    SubsidyConfigurationController,
    ProductPriceController,
  ],
  providers: [
    ProductTypeService,
    ProductTypeRepository,
    BrandService,
    BrandRepository,
    BrandProductTypeRepository,
    ProductService,
    ProductRepository,
    ProductPriceService,
    ProductPriceRepository,
    SubsidyConfigurationRepository,
    SubsidyConfigurationService,
    InstallationPricingRepository,
    InstallationPricingService,
    QuoteConfigurationRepository,
    QuoteConfigurationService,
  ],
  exports: [
    ProductTypeService,
    BrandService,
    ProductService,
    ProductPriceService,
    SubsidyConfigurationService,
    QuoteConfigurationService,
    ProductTypeRepository,
    BrandRepository,
    BrandProductTypeRepository,
    ProductRepository,
    ProductPriceRepository,
    SubsidyConfigurationRepository,
    InstallationPricingRepository,
    QuoteConfigurationRepository,
  ],
})
export class MasterDataModule {}
