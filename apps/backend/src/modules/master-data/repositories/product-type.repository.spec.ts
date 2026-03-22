/**
 * ProductTypeRepository unit tests
 *
 * Regression tests for TypeORM getManyAndCount crash with leftJoinAndSelect.
 * These tests verify the query builder is constructed correctly without hitting
 * a real database (the crash happens in TypeORM internals before SQL is sent).
 */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductTypeRepository } from './product-type.repository';
import { ProductTypeEntity } from '../entities/product-type.entity';

const makeQb = () => {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb as unknown as ReturnType<typeof makeQb>;
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
    qb[m] = jest.fn().mockReturnValue(chain());
  });
  qb['getCount'] = jest.fn().mockResolvedValue(3);
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  qb['getManyAndCount'] = jest
    .fn()
    .mockRejectedValue(new Error('getManyAndCount should NOT be called — use getCount + getMany'));
  return qb;
};

describe('ProductTypeRepository', () => {
  let repo: ProductTypeRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
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
      (qb['getCount'] as jest.Mock).mockResolvedValue(5);
      (qb['getMany'] as jest.Mock).mockResolvedValue([{ id: 'pt-1' }]);
      const result = await repo.findAll('org-1', { page: 1, limit: 10 });
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
    });

    it('applies sortBy=sortOrder correctly', async () => {
      await repo.findAll('org-1', { sortBy: 'sortOrder', sortOrder: 'DESC' });
      expect(qb['orderBy']).toHaveBeenCalledWith('productType.sortOrder', 'DESC');
    });

    it('applies sortBy=name correctly', async () => {
      await repo.findAll('org-1', { sortBy: 'name' });
      expect(qb['orderBy']).toHaveBeenCalledWith('productType.name', 'ASC');
    });

    it('applies isActive filter', async () => {
      await repo.findAll('org-1', { isActive: true });
      expect(qb['andWhere']).toHaveBeenCalledWith('productType.is_active = :isActive', {
        isActive: true,
      });
    });

    it('applies search filter', async () => {
      await repo.findAll('org-1', { search: 'solar' });
      expect(qb['andWhere']).toHaveBeenCalledWith(
        '(productType.name ILIKE :search OR productType.code ILIKE :search)',
        { search: '%solar%' },
      );
    });

    it('applies pagination correctly', async () => {
      await repo.findAll('org-1', { page: 3, limit: 5 });
      expect(qb['skip']).toHaveBeenCalledWith(10); // (3-1)*5
      expect(qb['take']).toHaveBeenCalledWith(5);
    });
  });
});
