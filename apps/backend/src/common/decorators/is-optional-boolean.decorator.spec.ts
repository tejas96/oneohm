import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';

import { CustomerQueryDto } from '../../modules/customers/dto/customer-query.dto';
import { ServiceTicketQueryDto } from '../../modules/service-tickets/dto/service-ticket-query.dto';

/**
 * These run against the REAL global pipe options from `main.ts`. A weaker pipe
 * here would pass while production still failed open, which is the exact defect
 * being locked out.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const meta = (metatype: new () => unknown): ArgumentMetadata => ({
  type: 'query',
  metatype,
  data: undefined,
});

const parse = <T>(dto: new () => T, query: Record<string, string>): Promise<T> =>
  pipe.transform({ ...query }, meta(dto)) as Promise<T>;

describe('IsOptionalBoolean', () => {
  describe('accepts only canonical booleans', () => {
    it.each([
      ['true', true],
      ['false', false],
    ])('?mine=%s -> %s', async (raw, expected) => {
      await expect(parse(CustomerQueryDto, { mine: raw })).resolves.toMatchObject({
        mine: expected,
      });
    });

    /**
     * The regression this decorator exists for.
     *
     * These used to transform to `undefined`, which `@IsOptional()` reads as
     * "absent" — so the filter silently did not apply and the caller got every
     * customer in the company with HTTP 200 while believing they had asked for
     * their own caseload. A filter meaning "only mine" must fail CLOSED.
     */
    it.each(['1', '0', 'yes', 'no', 'TRUE', 'False', '', 'null', 'undefined'])(
      '?mine=%p is rejected, not ignored',
      async (raw) => {
        await expect(parse(CustomerQueryDto, { mine: raw })).rejects.toThrow();
      },
    );
  });

  describe('absent stays absent', () => {
    it('leaves the property unset so the filter does not apply', async () => {
      const dto = await parse(CustomerQueryDto, {});
      expect(dto.mine).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(dto, 'mine')).toBe(false);
    });
  });

  describe('false is preserved, not coerced to true', () => {
    /**
     * `enableImplicitConversion` runs `Boolean('false')`, which is `true`. Any
     * boolean here missing `@Type(() => String)` silently inverts. `needsFollowup`
     * was exactly that case before this decorator.
     */
    it.each(['hasProperty', 'hasActiveTickets', 'needsFollowup'] as const)(
      '?%s=false -> false',
      async (key) => {
        await expect(parse(CustomerQueryDto, { [key]: 'false' })).resolves.toMatchObject({
          [key]: false,
        });
      },
    );
  });

  describe('service tickets use the same rule', () => {
    it.each(['unassigned', 'overdue'] as const)('?%s rejects a non-boolean', async (key) => {
      await expect(parse(ServiceTicketQueryDto, { [key]: '1' })).rejects.toThrow();
      await expect(parse(ServiceTicketQueryDto, { [key]: 'false' })).resolves.toMatchObject({
        [key]: false,
      });
    });
  });

  describe('the shapes the web actually sends still validate', () => {
    it.each([
      [{}],
      [{ page: '2', limit: '50' }],
      [{ search: 'raj', status: 'active' }],
      [{ hasProperty: 'false' }],
      [{ hasActiveTickets: 'true' }],
      [{ needsFollowup: 'true' }],
      [{ createdBy: 'me' }],
      [{ sortBy: 'createdAt', sortOrder: 'DESC' }],
    ])('%p', async (query) => {
      await expect(parse(CustomerQueryDto, query as Record<string, string>)).resolves.toBeDefined();
    });
  });
});
