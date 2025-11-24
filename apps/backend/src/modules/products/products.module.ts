import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductCategoryController, ProductController } from './controllers';
import { ProductCategoryEntity, ProductEntity, PricingRuleEntity } from './entities';
import { ProductCategoryRepository, ProductRepository } from './repositories';
import { ProductCategoryService, ProductService } from './services';

/**
 * Products Module
 * Manages product catalog, categories, and pricing
 */
@Module({
  imports: [TypeOrmModule.forFeature([ProductCategoryEntity, ProductEntity, PricingRuleEntity])],
  controllers: [ProductCategoryController, ProductController],
  providers: [ProductCategoryService, ProductCategoryRepository, ProductService, ProductRepository],
  exports: [ProductCategoryService, ProductService, ProductCategoryRepository, ProductRepository],
})
export class ProductsModule {}
