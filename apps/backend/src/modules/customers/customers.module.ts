import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { CustomerController } from './controllers/customer.controller';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomerProfileRepository } from './repositories/customer-profile.repository';
import { CustomerService } from './services/customer.service';

/**
 * Customers Module
 * Manages customer profile entities and operations
 * Imports UsersModule for ProfileService (multi-org access verification)
 */
@Module({
  imports: [TypeOrmModule.forFeature([CustomerProfileEntity]), forwardRef(() => UsersModule)],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerProfileRepository],
  exports: [CustomerService, CustomerProfileRepository],
})
export class CustomersModule {}
