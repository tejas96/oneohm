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

  let qb: any;
  let createQueryBuilder: any;

  beforeEach(async () => {
    count = anyFn().mockResolvedValue(0);
    query = anyFn().mockResolvedValue([]);

    /* Chainable stub: every builder method returns the builder. */
    qb = {
      andWhereCalls: [] as unknown[][],
    };
    for (const method of ['leftJoinAndSelect', 'where', 'orderBy', 'skip', 'take']) {
      qb[method] = anyFn().mockReturnValue(qb);
    }
    qb.andWhere = jest.fn((...args: unknown[]) => {
      qb.andWhereCalls.push(args);
      return qb;
    });
    qb.getManyAndCount = anyFn().mockResolvedValue([[], 0]);
    createQueryBuilder = anyFn().mockReturnValue(qb);

    const moduleRef = await Test.createTestingModule({
      providers: [
        FollowupRepository,
        {
          provide: getRepositoryToken(FollowupEntity),
          useValue: { count, manager: { query }, createQueryBuilder },
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

  /**
   * These two shipped a bug that nothing here would have caught: they built
   * their day boundary from `new Date()`, which resolves in the API process's
   * timezone, while `summaryCounts` above has always used `date_trunc('day',
   * now())`, which resolves in the database's. With the API in IST and
   * Postgres in UTC the same question got two answers, and My Day rendered a
   * count of 2 directly above a list of 1.
   *
   * So these assert the boundary is expressed in SQL and never computed here.
   * A future edit that reaches for a JS Date fails on the first assertion.
   */
  describe('day boundaries', () => {
    const clauses = (): string =>
      qb.andWhereCalls.map((call: unknown[]) => String(call[0])).join(' ');

    it("scopes today by the database's day, not the process's", async () => {
      await repo.findTodayFollowups('user-1');

      expect(clauses()).toContain("date_trunc('day', now())");
      expect(clauses()).toContain("interval '1 day'");
    });

    it('treats overdue as before TODAY, not before now', async () => {
      await repo.findOverdueFollowups('user-1');

      /*
        This compared against `now()`, so a call booked for 09:00 became
        overdue at 09:01. A conversation scheduled for 23:00 has not been
        missed at 14:00.
      */
      expect(clauses()).toContain("followup.scheduledAt < date_trunc('day', now())");
      expect(clauses()).not.toContain('scheduledAt < now()');
      expect(clauses()).not.toContain("interval '1 day'");
    });

    it('returns only pending followups, scoped to the user asked for', async () => {
      await repo.findTodayFollowups('user-1');

      const bound = Object.assign({}, ...qb.andWhereCalls.map((call: unknown[]) => call[1] ?? {}));
      expect(bound).toMatchObject({
        status: FollowupStatus.PENDING,
        assignedToUserId: 'user-1',
      });
    });

    it('does not scope by user when none is given, so admin views still work', async () => {
      await repo.findOverdueFollowups(undefined);

      const bound = Object.assign({}, ...qb.andWhereCalls.map((call: unknown[]) => call[1] ?? {}));
      expect(bound.assignedToUserId).toBeUndefined();
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
