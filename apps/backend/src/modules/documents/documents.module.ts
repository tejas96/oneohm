// ============================================
// IMPORTS
// ============================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentController } from './controllers';
import { DocumentEntity } from './entities';
import { DocumentRepository } from './repositories';
import { DocumentService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProjectsModule } from '../projects/projects.module';
import { QuotesModule } from '../quotes/quotes.module';
import { UsersModule } from '../users/users.module';

/**
 * Documents Module
 * Document management with version control, digital signatures, and OTP verification
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    OrganizationsModule,
    UsersModule,
    ProjectsModule,
    CustomersModule,
    QuotesModule,
    PaymentsModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentRepository, DocumentService],
  exports: [DocumentRepository, DocumentService],
})
export class DocumentsModule {}
