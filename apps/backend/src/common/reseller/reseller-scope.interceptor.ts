import {
  ForbiddenException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, map, switchMap, type Observable } from 'rxjs';

import { redactForReseller } from './redact-for-reseller';
import { RESELLER_ALLOWED_KEY } from './reseller-allowed.decorator';
import { ResellerContextService } from './reseller-context.service';
import type { CurrentUserType } from '../../modules/auth/types';

/**
 * The reseller wall (spec §7.1).
 *
 * An INTERCEPTOR, not a guard: JwtAuthGuard is applied per controller, and a
 * global guard would run before it — with no user on the request yet.
 * Interceptors run after every guard, so `req.user` is set here.
 *
 * - Not signed in (public route) or not a reseller → untouched.
 * - Reseller on a route without @ResellerAllowed → 403.
 * - Reseller on an allowed route → `req.resellerId` set for @ResellerScope,
 *   and the response is redacted.
 */
@Injectable()
export class ResellerScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly context: ResellerContextService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: CurrentUserType; resellerId?: string | null }>();
    if (!req.user?.id) return next.handle();

    return from(this.context.resellerIdForUser(req.user.id)).pipe(
      switchMap((resellerId) => {
        req.resellerId = resellerId;
        if (!resellerId) return next.handle();

        const allowed = this.reflector.getAllAndOverride<boolean>(RESELLER_ALLOWED_KEY, [
          ctx.getHandler(),
          ctx.getClass(),
        ]);
        if (!allowed) throw new ForbiddenException('This is not available to resellers.');

        return next.handle().pipe(map((body) => redactForReseller(body)));
      }),
    );
  }
}
