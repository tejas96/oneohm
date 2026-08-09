import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateServiceTicketDto } from './create-service-ticket.dto';

/**
 * Customer and project are fixed at creation. Re-pointing a ticket at a
 * different project would silently move it between the property and project
 * tabs, so the API refuses rather than allowing a confusing edit.
 *
 * Status is not editable here either — it moves through PATCH /:id/status so
 * every transition lands in the history table.
 */
export class UpdateServiceTicketDto extends PartialType(
  OmitType(CreateServiceTicketDto, ['customerId', 'projectId'] as const),
) {}
