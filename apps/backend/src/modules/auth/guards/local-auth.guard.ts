import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Auth Guard
 * Protects routes with email/password authentication
 *
 * Uses LocalStrategy under the hood
 *
 * @example
 * ```typescript
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * async login(@Request() req) {
 *   return req.user; // User is attached by LocalStrategy
 * }
 * ```
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
