import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerController } from './controllers/customer.controller';
import { CustomerEntity } from './entities/customer.entity';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerService } from './services/customer.service';

/**
 * Customers Module
 * Manages customer/lead entities and operations
 */
@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity])],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository],
  exports: [CustomerService, CustomerRepository],
})
export class CustomersModule {}
