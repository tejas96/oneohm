import { Injectable, Logger } from '@nestjs/common';
import { type EntityManager } from 'typeorm';

import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';

/**
 * Ends a lead's followup chain.
 *
 * Every terminal path routes through here — quote accepted, converted to
 * project, marked lost — so they cannot drift apart. A won deal that keeps
 * nagging is the fastest way to make people distrust the whole followup list.
 *
 * Property-level closure always passes a propertyId, which leaves sibling
 * properties and the customer-level chain untouched.
 */
@Injectable()
export class LeadClosureService {
  private readonly logger = new Logger(LeadClosureService.name);

  constructor(
    private readonly followupRepository: FollowupRepository,
    private readonly propertyRepository: CustomerPropertyRepository,
    private readonly customerRepository: CustomerProfileRepository,
  ) {}

  /** Quote accepted or converted to a project: stop chasing this site. */
  async closeProperty(
    propertyId: string,
    customerId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const cancelled = await this.followupRepository.cancelPendingFor(
      customerId,
      propertyId,
      userId,
      manager,
    );
    if (cancelled > 0) {
      this.logger.log(`Closed ${cancelled} pending followup(s) for property ${propertyId}`);
    }
    return cancelled;
  }

  async markPropertyLost(
    propertyId: string,
    customerId: string,
    reason: string,
    userId: string,
  ): Promise<void> {
    await this.propertyRepository.markLost(propertyId, reason, userId);
    await this.closeProperty(propertyId, customerId, userId);
  }

  /** For an enquiry that never got a site. propertyId is null by definition. */
  async markCustomerLost(customerId: string, reason: string, userId: string): Promise<void> {
    await this.customerRepository.markLost(customerId, reason, userId);
    await this.followupRepository.cancelPendingFor(customerId, null, userId);
  }
}
