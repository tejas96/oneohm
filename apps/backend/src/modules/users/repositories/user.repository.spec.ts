import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserRepository } from './user.repository';
import { UserEntity } from '../entities/user.entity';

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
    'withDeleted',
    'where',
    'andWhere',
    'orderBy',
    'skip',
    'take',
    'select',
    'addSelect',
    'from',
    'leftJoin',
  ].forEach((m) => {
    qb[m] = mockFn().mockReturnValue(chain());
  });
  qb['getCount'] = mockFn().mockResolvedValue(0);
  qb['getMany'] = mockFn().mockResolvedValue([]);
  qb['getRawMany'] = mockFn().mockResolvedValue([]);
  return qb;
};

describe('UserRepository', () => {
  let repo: UserRepository;
  let qb: ReturnType<typeof makeQb>;

  beforeEach(async () => {
    qb = makeQb();
    const mockOrmRepo = {
      createQueryBuilder: mockFn().mockReturnValue(qb),
      manager: { createQueryBuilder: mockFn().mockReturnValue(qb) },
    };

    const module = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: getRepositoryToken(UserEntity), useValue: mockOrmRepo },
      ],
    }).compile();

    repo = module.get(UserRepository);
  });

  describe('findAll', () => {
    it('applies employee profile filtering when employeeOnly is true', async () => {
      await repo.findAll(1, 20, { employeeOnly: true });

      const andWhereCalls = qb['andWhere'].mock.calls.map((call) => String(call[0]));
      const hasEmployeeProfilesCheck = andWhereCalls.some((c) => c.includes('employee_profiles'));

      expect(hasEmployeeProfilesCheck).toBe(true);
    });

    it('does not apply employee filtering when employeeOnly is false or omitted', async () => {
      await repo.findAll(1, 20, { employeeOnly: false });
      const falseCalls = qb['andWhere'].mock.calls.map((call) => String(call[0]));

      qb['andWhere'].mock.calls = [];
      await repo.findAll(1, 20);
      const omittedCalls = qb['andWhere'].mock.calls.map((call) => String(call[0]));

      for (const calls of [falseCalls, omittedCalls]) {
        expect(calls.some((c) => c.includes('employee_profiles'))).toBe(false);
      }
    });
  });
});
