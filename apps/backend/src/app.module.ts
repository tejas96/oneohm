import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { ApprovalModule } from './modules/approvals/approval.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ResellersModule } from './modules/resellers/resellers.module';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
