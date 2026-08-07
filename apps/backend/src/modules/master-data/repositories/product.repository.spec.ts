/**
 * ProductRepository unit tests
 *
 * Regression tests for TypeORM getManyAndCount crash with leftJoinAndSelect.
 * product.findAll joins productType + brand then paginates — previously crashed.
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductRepository } from './product.repository';
import { ProductEntity } from '../entities/product.entity';

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
  qb['getManyAndCount'] = mockFn().mockRejectedValue(
    new Error('getManyAndCount should NOT be called — use getCount + getMany'),
  );
  return qb;
};

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = { createQueryBuilder: mockFn().mockReturnValue(qb) };

    const module = await Test.createTestingModule({
      providers: [
        ProductRepository,
        { provide: getRepositoryToken(ProductEntity), useValue: mockOrmRepo },
      ],
    }).compile();

    repo = module.get(ProductRepository);
  });

  describe('findAll', () => {
    it('uses getCount + getMany instead of getManyAndCount', async () => {
      await repo.findAll('org-1');
      expect(qb['getCount']).toHaveBeenCalled();
      expect(qb['getMany']).toHaveBeenCalled();
      expect(qb['getManyAndCount']).not.toHaveBeenCalled();
    });

    it('returns correct shape', async () => {
      qb['getCount'].mockResolvedValue(2);
      qb['getMany'].mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
      const result = await repo.findAll(1, 10);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('applies pagination skip/take correctly', async () => {
      await repo.findAll(2, 15);
      expect(qb['skip']).toHaveBeenCalledWith(15); // (2-1)*15
      expect(qb['take']).toHaveBeenCalledWith(15);
    });
  });
});
