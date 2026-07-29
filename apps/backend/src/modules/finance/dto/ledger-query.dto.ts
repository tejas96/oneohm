import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTOs for the ledger reporting endpoints.
 *
 * These exist as real classes rather than inline object literal types for a
 * specific reason: TypeScript emits an inline type as `Object`, and NestJS's
 * `ValidationPipe` skips validation entirely for an `Object` metatype. The
 * endpoints therefore received raw, unvalidated, untransformed query strings —
 * `?grain=foo` reached `date_trunc()` as a 500, and a non-numeric `limit`
 * produced `LIMIT NaN`.
 *
 * With a class metatype the global pipe runs, so `@Type(() => Number)` actually
 * coerces and `@IsIn` actually rejects.
 */

export class LedgerRangeQueryDto {
  @ApiPropertyOptional({ description: 'Start of the period (inclusive)', example: '2026-07-01' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End of the period (inclusive)', example: '2026-07-31' })
  @IsDateString()
  @IsOptional()
  to?: string;
}

export class CashFlowQueryDto extends LedgerRangeQueryDto {
  @ApiPropertyOptional({
    enum: ['day', 'week', 'month', 'year'],
    description: 'Bucket size for the series. Passed straight to date_trunc, so it must be valid.',
  })
  @IsIn(['day', 'week', 'month', 'year'])
  @IsOptional()
  grain?: 'day' | 'week' | 'month' | 'year';
}

export class LedgerEntriesQueryDto extends LedgerRangeQueryDto {
  @ApiPropertyOptional({ enum: ['in', 'out'], description: 'Omit for both directions' })
  @IsIn(['in', 'out'])
  @IsOptional()
  // An empty string arrives when a client serialises "no filter" as `?direction=`;
  // treat it as absent rather than letting it fail validation.
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  direction?: 'in' | 'out';

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}

export class ReceivablesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}
