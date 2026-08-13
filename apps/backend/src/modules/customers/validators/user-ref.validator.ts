import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Query params that name a user accept either a UUID or the literal `me`,
 * which the controller swaps for the caller's id.
 *
 * `@IsString()` alone is not enough to guard them. The global ValidationPipe
 * runs with `enableImplicitConversion: true`, so a nested query param such as
 * `?createdBy[a]=1` is coerced to the STRING `"[object Object]"` — which passes
 * `@IsString()`, reaches the repository, and is compared against a `uuid`
 * column. Postgres then raises `22P02 invalid input syntax for type uuid` and
 * the request fails as a 500 rather than a 400.
 *
 * Anything that is not `me` therefore has to look like a UUID before it gets
 * near the query builder.
 */

/** Any UUID version. Deliberately not pinned to v4 — ids here come from more than one generator. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CURRENT_USER_TOKEN = 'me';

@ValidatorConstraint({ name: 'isUserRefOrMe', async: false })
export class UserRefOrMeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Absent is fine; `@IsOptional()` owns that decision.
    if (value === undefined || value === null) return true;
    if (typeof value !== 'string') return false;
    return value === CURRENT_USER_TOKEN || UUID.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a UUID or "${CURRENT_USER_TOKEN}"`;
  }
}

export function IsUserRefOrMe(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: UserRefOrMeConstraint,
    });
  };
}
