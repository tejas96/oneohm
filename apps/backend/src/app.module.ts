import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './modules/customers/customers.module';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
