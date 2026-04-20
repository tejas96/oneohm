/**
 * QuoteRepository unit tests
 *
 * Regression tests for TypeORM getManyAndCount crash.
 * Both findAll (5 leftJoinAndSelect) and findWithFilters (addOrderBy on customer join)
 * previously crashed. These tests ensure the split getCount + getMany pattern is used.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuoteSortField, SortOrder } from '@oneohm-epc/shared/types';

import { QuoteRepository } from './quote.repository';
import { QuoteEntity } from '../entities/quote.entity';

interface MockFn {
  (...args: unknown[]): unknown;
  mockReturnValue: (v: unknown) => MockFn;
  mockResolvedValue: (v: unknown) => MockFn;
  mockRejectedValue: (v: unknown) => MockFn;
  mock: { calls: unknown[][] };
}

const mockFn = (): MockFn => jest.fn() as unknown as MockFn;

const makeQb = (): Record<string, MockFn> => {
  const qb: Record<string, MockFn> = {};
  const chain = (): Record<string, MockFn> => qb;
  [
    'createQueryBuilder',
    'leftJoinAndSelect',
    'select',
    'distinctOn',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ].forEach((m) => {
    qb[m] = mockFn().mockReturnValue(chain());
  });
  qb['getCount'] = mockFn().mockResolvedValue(0);
  qb['getMany'] = mockFn().mockResolvedValue([]);
  qb['getOne'] = mockFn().mockResolvedValue(null);
  qb['getManyAndCount'] = mockFn().mockRejectedValue(
    new Error('getManyAndCount should NOT be called — use getCount + getMany'),
  );
  return qb;
};

describe('QuoteRepository', () => {
  let repo: QuoteRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = { createQueryBuilder: mockFn().mockReturnValue(qb) };

    const module = await Test.createTestingModule({
      providers: [
        QuoteRepository,
        { provide: getRepositoryToken(QuoteEntity), useValue: mockOrmRepo },
      ],
    }).compile();

    repo = module.get(QuoteRepository);
  });

  describe('findWithFilters (property-level grouping + in-memory sorting)', () => {
    const baseQuery = {
      page: 1,
      limit: 20,
      sortBy: QuoteSortField.CREATED_AT,
      sortOrder: SortOrder.DESC,
    };

    it('uses getMany (no getCount) and does not call getManyAndCount', async () => {
      await repo.findWithFilters('org-1', baseQuery);
      expect(qb['getMany']).toHaveBeenCalled();
      expect(qb['getManyAndCount']).not.toHaveBeenCalled();
    });

    it('applies initial orderBy for property grouping', async () => {
      await repo.findWithFilters('org-1', {
        ...baseQuery,
        sortBy: QuoteSortField.CUSTOMER_NAME,
      });
      // Now uses in-memory sorting, so orderBy is only for createdAt (grouping logic)
      expect(qb['orderBy']).toHaveBeenCalledWith('quote.createdAt', 'DESC');
      expect(qb['addOrderBy']).toHaveBeenCalledWith('quote.id', 'DESC');
    });

    it('does in-memory pagination (no skip/take on query)', async () => {
      await repo.findWithFilters('org-1', { ...baseQuery, page: 2, limit: 10 });
      // In-memory pagination: no skip/take called on query builder
      expect(qb['skip']).not.toHaveBeenCalled();
      expect(qb['take']).not.toHaveBeenCalled();
    });
  });
});
