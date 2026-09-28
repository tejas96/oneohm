import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * The caller's reseller id (`employee_profiles.id`) when the caller IS a
 * reseller, otherwise undefined. Set by ResellerScopeInterceptor from the
 * database — never from anything the client sent.
 */
export const ResellerScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<{ resellerId?: string | null }>().resellerId ?? undefined,
);
