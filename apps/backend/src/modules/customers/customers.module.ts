import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerPropertyController } from './controllers/customer-property.controller';
import { CustomerController } from './controllers/customer.controller';
import { FollowupController } from './controllers/followup.controller';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomerPropertyEntity } from './entities/customer-property.entity';
import { FollowupEntity } from './entities/followup.entity';
import { CustomerProfileRepository } from './repositories/customer-profile.repository';
import { CustomerPropertyRepository } from './repositories/customer-property.repository';
import { FollowupRepository } from './repositories/followup.repository';
import { CustomerPropertyService } from './services/customer-property.service';
import { CustomerService } from './services/customer.service';
import { FollowupService } from './services/followup.service';
import { EmployeesModule } from '../employees/employees.module';
import { LoanFinanceModule } from '../loan-finance/loan-finance.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QuotesModule } from '../quotes/quotes.module';
import { SiteActivitiesModule } from '../site-activities/site-activities.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

/**
 * Customers Module
 * Manages customer profile, property, and followup entities and operations.
 * Site visit/activity logic has moved to SiteActivitiesModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerProfileEntity, CustomerPropertyEntity, FollowupEntity]),
    forwardRef(() => UsersModule),
    forwardRef(() => EmployeesModule),
    OrganizationsModule,
    QuotesModule,
    LoanFinanceModule,
    StorageModule,
    forwardRef(() => SiteActivitiesModule),
  ],
  controllers: [CustomerController, CustomerPropertyController, FollowupController],
  providers: [
    CustomerService,
    CustomerPropertyService,
    FollowupService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
    FollowupRepository,
  ],
  exports: [
    CustomerService,
    CustomerPropertyService,
    FollowupService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
    FollowupRepository,
  ],
})
export class CustomersModule {}
