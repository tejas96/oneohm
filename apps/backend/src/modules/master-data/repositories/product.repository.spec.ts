/**
 * ProductRepository unit tests
 *
 * Regression tests for TypeORM getManyAndCount crash with leftJoinAndSelect.
 * product.findAll joins productType + brand then paginates — previously crashed.
 */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductRepository } from './product.repository';
import { ProductEntity } from '../entities/product.entity';

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
  qb['getCount'] = jest.fn().mockResolvedValue(0);
  qb['getMany'] = jest.fn().mockResolvedValue([]);
  qb['getManyAndCount'] = jest
    .fn()
    .mockRejectedValue(new Error('getManyAndCount should NOT be called — use getCount + getMany'));
  return qb;
};

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

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
      (qb['getCount'] as jest.Mock).mockResolvedValue(2);
      (qb['getMany'] as jest.Mock).mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
      const result = await repo.findAll('org-1', 1, 10);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('applies pagination skip/take correctly', async () => {
      await repo.findAll('org-1', 2, 15);
      expect(qb['skip']).toHaveBeenCalledWith(15); // (2-1)*15
      expect(qb['take']).toHaveBeenCalledWith(15);
    });
  });
});
