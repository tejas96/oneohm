import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * An optional boolean query parameter that REJECTS anything that is not a boolean.
 *
 * Two traps live here, and both were being got wrong in copies scattered across
 * the query DTOs. Neither is obvious from the call site, which is why this is a
 * decorator rather than a convention.
 *
 * 1. `@Type(() => String)` is LOAD-BEARING. The global `ValidationPipe` runs with
 *    `enableImplicitConversion: true`, which coerces the query string to the
 *    property's reflected type *before* `@Transform` ever sees it — and
 *    `Boolean('false')` is `true`. Without this, `?flag=false` silently means
 *    `true`. Forcing the intermediate type to `String` keeps the raw text intact.
 *
 * 2. An unrecognised value is passed through UNCHANGED, not turned into
 *    `undefined`. Returning `undefined` was the original defect: `@IsOptional()`
 *    reads `undefined` as "absent" and skips `@IsBoolean()` altogether, so
 *    `?mine=1` and `?mine=yes` passed validation, arrived as `undefined`, and the
 *    filter quietly did not apply. The caller asked for their own caseload and
 *    was handed all 1200 customers with HTTP 200. A filter meaning "only mine"
 *    has to fail CLOSED. Handing the raw value through lets `@IsBoolean()` see it
 *    and answer 400.
 *
 * Absent still means absent: when the key is missing from the query string the
 * transform never runs at all, so `@IsOptional()` short-circuits and the filter
 * is simply not applied. Only `'true'`/`'false'` (and real booleans) are accepted.
 */
export function IsOptionalBoolean(): PropertyDecorator {
  return applyDecorators(
    IsOptional(),
    Type(() => String),
    Transform(({ value }: { value: unknown }) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    }),
    IsBoolean(),
  );
}
