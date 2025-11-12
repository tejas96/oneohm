import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { ApprovalModule } from './modules/approvals/approval.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ResellersModule } from './modules/resellers/resellers.module';
import { ServiceMaintenanceModule } from './modules/service-maintenance/service-maintenance.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    UsersModule,
    OrganizationsModule,
    CustomersModule,
    ResellersModule,
    ProductsModule,
    QuotesModule,
    ProjectsModule,
    InventoryModule,
    ApprovalModule,
    PaymentsModule,
    CommentsModule,
    DocumentsModule,
    ServiceMaintenanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
