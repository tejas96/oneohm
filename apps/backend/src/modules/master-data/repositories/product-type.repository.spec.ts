/**
 * ProductTypeRepository unit tests
 *
 * Regression tests for TypeORM getManyAndCount crash with leftJoinAndSelect.
 * These tests verify the query builder is constructed correctly without hitting
 * a real database (the crash happens in TypeORM internals before SQL is sent).
 */
// Explicit imports from @jest/globals make this file work regardless of which tsconfig
// the language server uses — it does not rely on ambient @types/jest globals.
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductTypeRepository } from './product-type.repository';
import { ProductTypeEntity } from '../entities/product-type.entity';

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
  qb['getCount'] = mockFn().mockResolvedValue(3);
  qb['getMany'] = mockFn().mockResolvedValue([]);
  qb['getManyAndCount'] = mockFn().mockRejectedValue(
    new Error('getManyAndCount should NOT be called — use getCount + getMany'),
  );
  return qb;
};

describe('ProductTypeRepository', () => {
  let repo: ProductTypeRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = {
      createQueryBuilder: mockFn().mockReturnValue(qb),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductTypeRepository,
        { provide: getRepositoryToken(ProductTypeEntity), useValue: mockOrmRepo },
      ],
    }).compile();

    repo = module.get(ProductTypeRepository);
  });

  describe('findAll', () => {
    it('uses getCount + getMany instead of getManyAndCount', async () => {
      await repo.findAll('org-1');
      expect(qb['getCount']).toHaveBeenCalled();
      expect(qb['getMany']).toHaveBeenCalled();
      expect(qb['getManyAndCount']).not.toHaveBeenCalled();
    });

    it('returns correct shape', async () => {
      qb['getCount'].mockResolvedValue(5);
      qb['getMany'].mockResolvedValue([{ id: 'pt-1' }]);
      const result = await repo.findAll({ page: 1, limit: 10 });
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
    });

    it('applies sortBy=sortOrder correctly', async () => {
      await repo.findAll({ sortBy: 'sortOrder', sortOrder: 'DESC' });
      expect(qb['orderBy']).toHaveBeenCalledWith('productType.sortOrder', 'DESC');
    });

    it('applies sortBy=name correctly', async () => {
      await repo.findAll({ sortBy: 'name' });
      expect(qb['orderBy']).toHaveBeenCalledWith('productType.name', 'ASC');
    });

    it('applies isActive filter', async () => {
      await repo.findAll({ isActive: true });
      expect(qb['andWhere']).toHaveBeenCalledWith('productType.is_active = :isActive', {
        isActive: true,
      });
    });

    it('applies search filter', async () => {
      await repo.findAll({ search: 'solar' });
      expect(qb['andWhere']).toHaveBeenCalledWith(
        '(productType.name ILIKE :search OR productType.code ILIKE :search)',
        { search: '%solar%' },
      );
    });

    it('applies pagination correctly', async () => {
      await repo.findAll({ page: 3, limit: 5 });
      expect(qb['skip']).toHaveBeenCalledWith(10); // (3-1)*5
      expect(qb['take']).toHaveBeenCalledWith(5);
    });
  });
});
