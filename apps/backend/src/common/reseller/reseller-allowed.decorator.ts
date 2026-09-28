import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const RESELLER_ALLOWED_KEY = 'resellerAllowed';

/**
 * Opens a route (or a whole controller) to reseller users.
 *
 * Everything else answers 403 to a reseller: a route added next year is
 * CLOSED to partners until someone opens it on purpose. Opening a route is a
 * promise that its handler scopes to `@ResellerScope()` — see spec §7.
 */
export const ResellerAllowed = (): CustomDecorator => SetMetadata(RESELLER_ALLOWED_KEY, true);
