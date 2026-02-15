import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerPropertyController } from './controllers/customer-property.controller';
import { CustomerController } from './controllers/customer.controller';
import { FollowupController } from './controllers/followup.controller';
import { SiteVisitController } from './controllers/site-visit.controller';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomerPropertyEntity } from './entities/customer-property.entity';
import { FollowupEntity } from './entities/followup.entity';
import { SiteVisitEntity } from './entities/site-visit.entity';
import { CustomerProfileRepository } from './repositories/customer-profile.repository';
import { CustomerPropertyRepository } from './repositories/customer-property.repository';
import { FollowupRepository } from './repositories/followup.repository';
import { SiteVisitRepository } from './repositories/site-visit.repository';
import { CustomerPropertyService } from './services/customer-property.service';
import { CustomerService } from './services/customer.service';
import { FollowupService } from './services/followup.service';
import { SiteVisitService } from './services/site-visit.service';
import { LoanFinanceModule } from '../loan-finance/loan-finance.module';
import { QuotesModule } from '../quotes/quotes.module';
import { UsersModule } from '../users/users.module';

/**
 * Customers Module
 * Manages customer profile, property, and site visit entities and operations
 * Imports UsersModule for ProfileService (multi-org access verification)
 * Imports QuotesModule for quote info enrichment on properties
 * Imports LoanFinanceModule for loan application validation
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerProfileEntity,
      CustomerPropertyEntity,
      FollowupEntity,
      SiteVisitEntity,
    ]),
    forwardRef(() => UsersModule),
    QuotesModule,
    LoanFinanceModule,
  ],
  controllers: [
    CustomerController,
    CustomerPropertyController,
    FollowupController,
    SiteVisitController,
  ],
  providers: [
    CustomerService,
    CustomerPropertyService,
    FollowupService,
    SiteVisitService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
    FollowupRepository,
    SiteVisitRepository,
  ],
  exports: [
    CustomerService,
    CustomerPropertyService,
    FollowupService,
    SiteVisitService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
    FollowupRepository,
    SiteVisitRepository,
  ],
})
export class CustomersModule {}
