/**
 * FollowupRepository unit tests
 *
 * The gaps and pending-count queries are the enforcement backbone: if they are
 * wrong, leads silently vanish from the Needs follow-up bucket. These pin the
 * SQL shape rather than the results, which is all a mocked repository can
 * honestly assert — the query is exercised against real data in the plan's
 * verification step.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowupStatus } from '@tejas96/shared/types';

import { FollowupRepository } from './followup.repository';
import { FollowupEntity } from '../entities/followup.entity';

const anyFn = (): any => jest.fn();

describe('FollowupRepository', () => {
  let repo: FollowupRepository;
  let count: any;
  let query: any;

  beforeEach(async () => {
    count = anyFn().mockResolvedValue(0);
    query = anyFn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowupRepository,
        {
          provide: getRepositoryToken(FollowupEntity),
          useValue: { count, manager: { query } },
        },
      ],
    }).compile();

    repo = moduleRef.get(FollowupRepository);
  });

  describe('countPendingForUnit', () => {
    it('counts only pending, undeleted followups for a property unit', async () => {
      await repo.countPendingForUnit('cust-1', 'prop-1');

      const where = count.mock.calls[0][0].where;
      expect(where.customerId).toBe('cust-1');
      expect(where.propertyId).toBe('prop-1');
      expect(where.status).toBe(FollowupStatus.PENDING);
      expect(where.deletedAt).toBeDefined();
    });

    it('treats a null propertyId as IS NULL, not as a value', async () => {
      await repo.countPendingForUnit('cust-1', null);

      const where = count.mock.calls[0][0].where;
      // A customer-level chain must not match property rows, and vice versa.
      expect(where.propertyId).toBeDefined();
      expect(where.propertyId).not.toBeNull();
    });

    it('excludes a given followup id so a completing row does not count itself', async () => {
      await repo.countPendingForUnit('cust-1', 'prop-1', 'followup-9');

      const where = count.mock.calls[0][0].where;
      expect(where.id).toBeDefined();
    });
  });

  describe('findGaps', () => {
    it('returns both customer and property lead units in one query', async () => {
      await repo.findGaps();

      const sql = String(query.mock.calls[0][0]);
      expect(sql).toContain('NOT EXISTS');
      expect(sql).toContain('customer_properties');
      expect(sql).toContain('customer_profiles');
      expect(sql).toContain('UNION ALL');
    });

    it('excludes every terminal state, or closed leads nag forever', async () => {
      await repo.findGaps();

      const sql = String(query.mock.calls[0][0]);
      expect(sql).toContain('converted');
      expect(sql).toContain('lost');
      // A property whose quote was accepted is closed too.
      expect(sql).toContain('quotes');
      expect(sql).toContain('accepted');
    });

    it('attributes each gap to a user so nothing is ownerless', async () => {
      await repo.findGaps();

      const sql = String(query.mock.calls[0][0]);
      expect(sql).toContain('attributedUserId');
      expect(sql).toContain('created_by');
    });
  });

  describe('summaryCounts', () => {
    it('scopes to one user when a userId is given', async () => {
      query.mockResolvedValue([{ overdue: '3', today: '1', upcoming: '7' }]);

      const result = await repo.summaryCounts('user-1');

      expect(query.mock.calls[0][1]).toEqual(['user-1']);
      // Postgres COUNT comes back as a string; the caller wants numbers.
      expect(result).toEqual({ overdue: 3, today: 1, upcoming: 7 });
    });

    it('returns zeros rather than NaN when the query yields no row', async () => {
      query.mockResolvedValue([]);

      expect(await repo.summaryCounts(null)).toEqual({ overdue: 0, today: 0, upcoming: 0 });
    });
  });
});
