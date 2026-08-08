import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerFeedbackController } from './controllers';
import { CustomerFeedbackEntity } from './entities';
import { CustomerFeedbackRepository } from './repositories';
import { CustomerFeedbackService } from './services';
import { CustomersModule } from '../customers/customers.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';

/**
 * Customer Feedback Module
 * Handles customer feedback, NPS tracking, testimonials, and satisfaction analytics
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerFeedbackEntity]),
    CustomersModule,
    ProjectsModule,
    UsersModule,
  ],
  controllers: [CustomerFeedbackController],
  providers: [CustomerFeedbackRepository, CustomerFeedbackService],
  exports: [CustomerFeedbackService, CustomerFeedbackRepository],
})
export class CustomerFeedbackModule {}
