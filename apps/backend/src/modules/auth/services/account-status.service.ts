import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { UserStatus } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

const TTL_MS = 60_000;

/** What login says to a non-active account. Shared by login and JwtStrategy so both say the same. */
export function accountStatusMessage(status: string): string {
  const messages: Partial<Record<UserStatus, string>> = {
    [UserStatus.INACTIVE]: 'Your account is inactive. Please contact your administrator.',
    [UserStatus.SUSPENDED]: 'Your account has been suspended. Please contact your administrator.',
    [UserStatus.ARCHIVED]: 'Your account has been removed. Please contact your administrator.',
    [UserStatus.PENDING]: 'Your account is pending approval. Please contact your administrator.',
  };
  return (
    messages[status as UserStatus] ??
    'Your account is not active. Please contact your administrator.'
  );
}

/**
 * "May this user's access token still be used?" from users.status and
 * users.deleted_at, cached per user for a minute. JwtStrategy asks on every
 * authenticated request, so a deactivated or deleted user loses access within
 * 60 seconds instead of when the token expires (JWT_EXPIRES_IN).
 *
 * A DB error is not cached and propagates (500): an outage must not look like
 * every account was deactivated.
 */
@Injectable()
export class AccountStatusService {
  private readonly cache = new Map<string, { refusal: string | null; at: number }>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** The login message for a user who may not use the API, or null when the account is active. */
  async refusalFor(userId: string): Promise<string | null> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.refusal;
    const [row] = await this.dataSource.query(
      `SELECT status, deleted_at FROM users WHERE id = $1`,
      [userId],
    );
    let refusal: string | null = null;
    if (!row) {
      refusal = accountStatusMessage(UserStatus.ARCHIVED);
    } else if (row.deleted_at || row.status !== UserStatus.ACTIVE) {
      refusal = accountStatusMessage(row.status as string);
    }
    this.cache.set(userId, { refusal, at: Date.now() });
    return refusal;
  }
  /** Drop the cached answer so an admin's status change, restore or delete applies at once. */
  forget(userId: string): void {
    this.cache.delete(userId);
  }
}
