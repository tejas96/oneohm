/**
 * QuoteRepository unit tests
 *
 * Regression tests for TypeORM getManyAndCount crash.
 * Both findAll (5 leftJoinAndSelect) and findWithFilters (addOrderBy on customer join)
 * previously crashed. These tests ensure the split getCount + getMany pattern is used.
 */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuoteSortField, SortOrder } from '@oneohm-epc/shared/types';

import { QuoteRepository } from './quote.repository';
import { QuoteEntity } from '../entities/quote.entity';

const makeQb = () => {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as unknown as ReturnType<typeof makeQb>;
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
    qb[m] = jest.fn().mockReturnValue(chain());
  });
  qb['getCount'] = jest.fn().mockResolvedValue(0);
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  qb['getOne'] = jest.fn().mockResolvedValue(null);
  qb['getManyAndCount'] = jest
    .fn()
    .mockRejectedValue(new Error('getManyAndCount should NOT be called — use getCount + getMany'));
  return qb;
};

describe('QuoteRepository', () => {
  let repo: QuoteRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module = await Test.createTestingModule({
      providers: [
        QuoteRepository,
        { provide: getRepositoryToken(QuoteEntity), useValue: mockOrmRepo },
      ],
    }).compile();

    repo = module.get(QuoteRepository);
  });

  describe('findAll (simple list)', () => {
    it('uses getCount + getMany instead of getManyAndCount', async () => {
      await repo.findAll('org-1', 1, 20);
      expect(qb['getCount']).toHaveBeenCalled();
      expect(qb['getMany']).toHaveBeenCalled();
      expect(qb['getManyAndCount']).not.toHaveBeenCalled();
    });

    it('returns correct shape', async () => {
      (qb['getCount'] as jest.Mock).mockResolvedValue(1);
      (qb['getMany'] as jest.Mock).mockResolvedValue([{ id: 'q-1' }]);
      const result = await repo.findAll('org-1', 1, 10);
      expect(result.total).toBe(1);
      expect(result.quotes).toHaveLength(1);
    });
  });

  describe('findWithFilters (sort + pagination)', () => {
    const baseQuery = {
      page: 1,
      limit: 20,
      sortBy: QuoteSortField.CREATED_AT,
      sortOrder: SortOrder.DESC,
    };

    it('uses getCount + getMany instead of getManyAndCount', async () => {
      await repo.findWithFilters('org-1', baseQuery);
      expect(qb['getCount']).toHaveBeenCalled();
      expect(qb['getMany']).toHaveBeenCalled();
      expect(qb['getManyAndCount']).not.toHaveBeenCalled();
    });

    it('applies addOrderBy when sorting by CUSTOMER_NAME', async () => {
      await repo.findWithFilters('org-1', {
        ...baseQuery,
        sortBy: QuoteSortField.CUSTOMER_NAME,
      });
      expect(qb['addOrderBy']).toHaveBeenCalledWith('customer.lastName', 'DESC', 'NULLS LAST');
    });

    it('applies pagination correctly', async () => {
      await repo.findWithFilters('org-1', { ...baseQuery, page: 2, limit: 10 });
      expect(qb['skip']).toHaveBeenCalledWith(10);
      expect(qb['take']).toHaveBeenCalledWith(10);
    });
  });
});
