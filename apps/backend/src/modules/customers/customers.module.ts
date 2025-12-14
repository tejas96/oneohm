import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerPropertyController } from './controllers/customer-property.controller';
import { CustomerController } from './controllers/customer.controller';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomerPropertyEntity } from './entities/customer-property.entity';
import { CustomerProfileRepository } from './repositories/customer-profile.repository';
import { CustomerPropertyRepository } from './repositories/customer-property.repository';
import { CustomerPropertyService } from './services/customer-property.service';
import { CustomerService } from './services/customer.service';
import { UsersModule } from '../users/users.module';

/**
 * Customers Module
 * Manages customer profile and property entities and operations
 * Imports UsersModule for ProfileService (multi-org access verification)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerProfileEntity, CustomerPropertyEntity]),
    forwardRef(() => UsersModule),
  ],
  controllers: [CustomerController, CustomerPropertyController],
  providers: [
    CustomerService,
    CustomerPropertyService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
  ],
  exports: [
    CustomerService,
    CustomerPropertyService,
    CustomerProfileRepository,
    CustomerPropertyRepository,
  ],
})
export class CustomersModule {}
