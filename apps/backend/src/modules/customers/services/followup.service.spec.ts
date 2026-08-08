/**
 * FollowupService.complete — the enforcement point.
 *
 * The one rule is "every open lead unit keeps at least one pending followup".
 * These tests pin the exact condition under which a next followup is mandatory,
 * because getting it wrong either lets leads go dark or nags people for a second
 * followup they do not need.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FollowupOutcome, FollowupStatus } from '@tejas96/shared/types';

import { FollowupService } from './followup.service';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../repositories/customer-property.repository';
import { FollowupRepository } from '../repositories/followup.repository';

const anyFn = (): any => jest.fn();

const PENDING_FOLLOWUP = {
  id: 'followup-1',
  customerId: 'cust-1',
  propertyId: 'prop-1',
  status: FollowupStatus.PENDING,
};

const VALID_NEXT = {
  scheduledAt: '2026-08-11T10:00:00.000Z',
  assignedToUserId: '11111111-1111-1111-1111-111111111111',
  subject: 'Call back',
};

interface Harness {
  service: FollowupService;
  followupRepo: any;
  propertyRepo: any;
  customerRepo: any;
}

async function makeService(overrides: { roles?: unknown[] } = {}): Promise<Harness> {
  const followupRepo = {
    findById: anyFn().mockResolvedValue(PENDING_FOLLOWUP),
    update: anyFn().mockResolvedValue({ ...PENDING_FOLLOWUP, status: FollowupStatus.COMPLETED }),
    create: anyFn().mockResolvedValue({ id: 'followup-2' }),
    countPendingForUnit: anyFn().mockResolvedValue(0),
    cancelPendingFor: anyFn().mockResolvedValue(1),
    // The service wraps completion in a transaction; run the callback inline.
    repository: { manager: { transaction: async (cb: any) => cb({}) } },
  };
  const propertyRepo = {
    findById: anyFn().mockResolvedValue({ id: 'prop-1', customerId: 'cust-1' }),
    markLost: anyFn().mockResolvedValue(undefined),
  };
  const customerRepo = {
    findById: anyFn().mockResolvedValue({ id: 'cust-1' }),
    markLost: anyFn().mockResolvedValue(undefined),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      FollowupService,
      { provide: FollowupRepository, useValue: followupRepo },
      { provide: CustomerProfileRepository, useValue: customerRepo },
      { provide: CustomerPropertyRepository, useValue: propertyRepo },
      {
        provide: UserRoleRepository,
        useValue: {
          findByUserAndOrganization: anyFn().mockResolvedValue(overrides.roles ?? [{ id: 'r' }]),
        },
      },
    ],
  }).compile();

  return { service: moduleRef.get(FollowupService), followupRepo, propertyRepo, customerRepo };
}

describe('FollowupService.complete', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await makeService();
  });

  it('rejects completion with no next followup when it is the last pending one', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(0);

    await expect(
      h.service.complete('followup-1', { outcome: FollowupOutcome.INTERESTED }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows completion with no next followup when siblings are still pending', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(2);

    await expect(
      h.service.complete('followup-1', { outcome: FollowupOutcome.INTERESTED }, 'user-1'),
    ).resolves.toBeDefined();

    expect(h.followupRepo.create.mock.calls.length).toBe(0);
  });

  it('creates exactly one next followup when next is supplied', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(0);

    await h.service.complete(
      'followup-1',
      { outcome: FollowupOutcome.NEGOTIATING, next: VALID_NEXT },
      'user-1',
    );

    expect(h.followupRepo.create.mock.calls.length).toBe(1);
    const created = h.followupRepo.create.mock.calls[0][0];
    expect(created.customerId).toBe('cust-1');
    expect(created.propertyId).toBe('prop-1');
    expect(created.status).toBe(FollowupStatus.PENDING);
  });

  it('records the outcome and a completion timestamp', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(2);

    await h.service.complete('followup-1', { outcome: FollowupOutcome.SITE_VISIT_DONE }, 'user-1');

    const updates = h.followupRepo.update.mock.calls[0][1];
    expect(updates.status).toBe(FollowupStatus.COMPLETED);
    expect(updates.outcome).toBe(FollowupOutcome.SITE_VISIT_DONE);
    expect(updates.completedAt).toBeInstanceOf(Date);
  });

  it('rejects outcome "other" without notes', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(2);

    await expect(
      h.service.complete('followup-1', { outcome: FollowupOutcome.OTHER }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts outcome "other" with notes', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(2);

    await expect(
      h.service.complete(
        'followup-1',
        { outcome: FollowupOutcome.OTHER, notes: 'Customer relocating' },
        'user-1',
      ),
    ).resolves.toBeDefined();
  });

  it('terminal "accepted" cancels pending followups and creates none', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(0);

    await h.service.complete(
      'followup-1',
      { outcome: FollowupOutcome.INTERESTED, terminal: 'accepted' },
      'user-1',
    );

    expect(h.followupRepo.cancelPendingFor.mock.calls.length).toBe(1);
    expect(h.followupRepo.create.mock.calls.length).toBe(0);
  });

  it('terminal "lost" requires a reason', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(0);

    await expect(
      h.service.complete(
        'followup-1',
        { outcome: FollowupOutcome.NOT_INTERESTED, terminal: 'lost' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('terminal "lost" on a property marks that property, not the customer', async () => {
    h.followupRepo.countPendingForUnit.mockResolvedValue(0);

    await h.service.complete(
      'followup-1',
      { outcome: FollowupOutcome.NOT_INTERESTED, terminal: 'lost', lostReason: 'Competitor' },
      'user-1',
    );

    expect(h.propertyRepo.markLost.mock.calls.length).toBe(1);
    expect(h.customerRepo.markLost.mock.calls.length).toBe(0);
  });

  it('terminal "lost" on a customer-level followup marks the customer', async () => {
    h.followupRepo.findById.mockResolvedValue({ ...PENDING_FOLLOWUP, propertyId: null });
    h.followupRepo.countPendingForUnit.mockResolvedValue(0);

    await h.service.complete(
      'followup-1',
      { outcome: FollowupOutcome.NOT_INTERESTED, terminal: 'lost', lostReason: 'Never reachable' },
      'user-1',
    );

    expect(h.customerRepo.markLost.mock.calls.length).toBe(1);
    expect(h.propertyRepo.markLost.mock.calls.length).toBe(0);
  });

  it('refuses to complete an already-completed followup', async () => {
    h.followupRepo.findById.mockResolvedValue({
      ...PENDING_FOLLOWUP,
      status: FollowupStatus.COMPLETED,
    });

    await expect(
      h.service.complete('followup-1', { outcome: FollowupOutcome.INTERESTED }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
