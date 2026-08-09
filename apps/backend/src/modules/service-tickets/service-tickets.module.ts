import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceTicketController } from './controllers';
import { ServiceTicketEntity, ServiceTicketStatusHistoryEntity } from './entities';
import { ServiceTicketRepository } from './repositories';
import { ServiceTicketService } from './services';
import { ProjectEntity } from '../projects/entities/project.entity';

/**
 * Service Tickets — post-handover complaints, AMC queries and general issues.
 *
 * ProjectEntity is registered here (not imported from ProjectsModule) purely so
 * the service can validate that a ticket's project belongs to its customer.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceTicketEntity,
      ServiceTicketStatusHistoryEntity,
      ProjectEntity,
    ]),
  ],
  controllers: [ServiceTicketController],
  providers: [ServiceTicketService, ServiceTicketRepository],
  exports: [ServiceTicketService, ServiceTicketRepository],
})
export class ServiceTicketsModule {}
