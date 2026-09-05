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
import { LeadClosureService } from './services/lead-closure.service';
import { SiteWorkService } from './services/site-work.service';
import { DiscomsModule } from '../discoms/discoms.module';
import { EmployeesModule } from '../employees/employees.module';
import { IamModule } from '../iam/iam.module';
import { LoanFinanceModule } from '../loan-finance/loan-finance.module';
import { QuotesModule } from '../quotes/quotes.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

/**
 * Customers Module
 * Manages customer profile, property, followup entities and operations.
 * Site visit/survey logic is integrated into CustomerPropertyService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerProfileEntity, CustomerPropertyEntity, FollowupEntity]),
    forwardRef(() => UsersModule),
    forwardRef(() => EmployeesModule),
    forwardRef(() => QuotesModule),
    LoanFinanceModule,
    StorageModule,
    IamModule,
    DiscomsModule,
  ],
  controllers: [CustomerController, CustomerPropertyController, FollowupController],
  providers: [
    CustomerService,
    CustomerPropertyService,
    FollowupService,
    LeadClosureService,
    SiteWorkService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
    FollowupRepository,
  ],
  exports: [
    CustomerService,
    CustomerPropertyService,
    FollowupService,
    LeadClosureService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
    FollowupRepository,
  ],
})
export class CustomersModule {}
