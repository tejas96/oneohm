/**
 * LeadClosureService — the single place a lead's chain is ended.
 *
 * Centralised so quote acceptance, project conversion and mark-lost cannot
 * drift apart: a won deal that keeps nagging is the fastest way to make people
 * distrust the whole followup list.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';

import { LeadClosureService } from './lead-closure.service';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';

const anyFn = (): any => jest.fn();

describe('LeadClosureService', () => {
  let service: LeadClosureService;
  let followupRepo: any;
  let propertyRepo: any;
  let customerRepo: any;

  beforeEach(async () => {
    followupRepo = { cancelPendingFor: anyFn().mockResolvedValue(2) };
    propertyRepo = { markLost: anyFn().mockResolvedValue(undefined) };
    customerRepo = { markLost: anyFn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LeadClosureService,
        { provide: FollowupRepository, useValue: followupRepo },
        { provide: CustomerPropertyRepository, useValue: propertyRepo },
        { provide: CustomerProfileRepository, useValue: customerRepo },
      ],
    }).compile();

    service = moduleRef.get(LeadClosureService);
  });

  it("closeProperty cancels that property's pending followups", async () => {
    const cancelled = await service.closeProperty('prop-1', 'cust-1', 'user-1');

    expect(followupRepo.cancelPendingFor.mock.calls[0][0]).toBe('cust-1');
    expect(followupRepo.cancelPendingFor.mock.calls[0][1]).toBe('prop-1');
    expect(cancelled).toBe(2);
  });

  it('closeProperty never touches the customer-level chain', async () => {
    await service.closeProperty('prop-1', 'cust-1', 'user-1');

    // A null propertyId would match the customer chain and sibling-less rows.
    expect(followupRepo.cancelPendingFor.mock.calls.every((c: unknown[]) => c[1] !== null)).toBe(
      true,
    );
  });

  it('markPropertyLost records the reason and closes the chain', async () => {
    await service.markPropertyLost('prop-1', 'cust-1', 'Competitor pricing', 'user-1');

    expect(propertyRepo.markLost.mock.calls[0][1]).toBe('Competitor pricing');
    expect(followupRepo.cancelPendingFor.mock.calls.length).toBe(1);
  });

  it('markCustomerLost closes the customer chain with a null propertyId', async () => {
    await service.markCustomerLost('cust-1', 'Never reachable', 'user-1');

    expect(customerRepo.markLost.mock.calls[0][1]).toBe('Never reachable');
    expect(followupRepo.cancelPendingFor.mock.calls[0][1]).toBeNull();
  });
});
