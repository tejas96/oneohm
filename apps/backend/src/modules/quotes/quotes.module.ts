import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuoteController } from './controllers';
import { QuoteEntity, QuoteLineItemEntity, QuoteVersionEntity } from './entities';
import {
  QuoteLineItemRepository,
  QuoteRepository,
  QuoteVersionRepository,
} from './repositories';
import { QuoteService } from './services';
import { OrganizationsModule } from '../organizations/organizations.module';

/**
 * Quotes Module
 * Manages quotes, quotations, versions, and line items
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteEntity, QuoteVersionEntity, QuoteLineItemEntity]),
    OrganizationsModule, // For organization repository
  ],
  controllers: [QuoteController],
  providers: [
    QuoteService,
    QuoteRepository,
    QuoteVersionRepository,
    QuoteLineItemRepository,
  ],
  exports: [QuoteService, QuoteRepository],
})
export class QuotesModule {}


