import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Auth Guard
 * Uses LocalStrategy for email/password authentication
 *
 * Usage:
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * async login(@Request() req) {
 *   // req.user contains validated user from LocalStrategy
 * }
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
