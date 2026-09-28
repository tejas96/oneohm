import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const TTL_MS = 60_000;

/**
 * "Is this user a reseller?" from employee_profiles.profile_kind, cached per
 * user for a minute (spec §7.1, edge case 41). profile_kind is locked once
 * history exists (Task 12), so the cache cannot hide a meaningful change.
 */
@Injectable()
export class ResellerContextService {
  private readonly cache = new Map<string, { id: string | null; at: number }>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resellerIdForUser(userId: string): Promise<string | null> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.id;
    const [row] = await this.dataSource.query(
      `SELECT id FROM employee_profiles
        WHERE user_id = $1 AND profile_kind = 'reseller' AND deleted_at IS NULL`,
      [userId],
    );
    const id = (row?.id as string | undefined) ?? null;
    this.cache.set(userId, { id, at: Date.now() });
    return id;
  }

  /** Spec §7.4: a reseller can only be given work on a customer he brought in. By users.id. */
  async assertAssignableUser(assigneeUserId: string | null | undefined, customerId: string): Promise<void> {
    if (!assigneeUserId) return;
    const resellerId = await this.resellerIdForUser(assigneeUserId);
    if (resellerId) await this.assertCustomerIsResellers(resellerId, customerId);
  }

  /** Same rule, for routes that take an employee_profiles.id (service tickets). */
  async assertAssignableProfile(assigneeProfileId: string | null | undefined, customerId: string): Promise<void> {
    if (!assigneeProfileId) return;
    const [row] = await this.dataSource.query(
      `SELECT id FROM employee_profiles WHERE id = $1 AND profile_kind = 'reseller'`,
      [assigneeProfileId],
    );
    if (row) await this.assertCustomerIsResellers(assigneeProfileId, customerId);
  }

  private async assertCustomerIsResellers(resellerId: string, customerId: string): Promise<void> {
    const [row] = await this.dataSource.query(
      `SELECT 1 FROM customer_profiles WHERE id = $1 AND reseller_id = $2`,
      [customerId, resellerId],
    );
    if (!row) {
      throw new BadRequestException('A reseller can only be given work on customers they brought in.');
    }
  }
}
