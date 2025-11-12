// ============================================
// IMPORTS
// ============================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentController } from './controllers/payment.controller';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentService } from './services/payment.service';
import { CustomersModule } from '../customers/customers.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';

/**
 * PaymentsModule
 * Module 11: Payments
 * Handles payment tracking for projects with milestone-based support
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    OrganizationsModule,
    ProjectsModule,
    CustomersModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentRepository, PaymentService],
})
export class PaymentsModule {}

