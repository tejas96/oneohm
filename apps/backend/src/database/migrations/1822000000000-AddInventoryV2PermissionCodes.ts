import { type MigrationInterface, type QueryRunner } from 'typeorm';

type PermissionSeed = {
  name: string;
  code: string;
  action: string;
  scope: string;
};

/**
 * Phase 2 inventory rebuild — adds new permission codes for export, bulk
 * actions, federated search, dedicated cancel grants, and saved views.
 *
 * Also deactivates the unused plural `purchase-orders:*` permission family
 * left over from the original IAM seed; controllers exclusively use the
 * singular `purchase-order:*` codes registered by 1821000000000.
 */
export class AddInventoryV2PermissionCodes1822000000000 implements MigrationInterface {
  name = 'AddInventoryV2PermissionCodes1822000000000';

  private readonly permissions: PermissionSeed[] = [
    { name: 'Export Inventory', code: 'inventory:export', action: 'export', scope: 'all' },
    { name: 'Bulk Inventory Actions', code: 'inventory:bulk', action: 'bulk', scope: 'all' },
    { name: 'Search Inventory', code: 'inventory:search', action: 'search', scope: 'all' },
    {
      name: 'Cancel Purchase Orders',
      code: 'purchase-order:cancel',
      action: 'cancel',
      scope: 'all',
    },
    { name: 'Cancel Allocations', code: 'allocation:cancel', action: 'cancel', scope: 'all' },
    { name: 'Cancel Dispatches', code: 'dispatch:cancel', action: 'cancel', scope: 'all' },
    { name: 'Read Saved Views', code: 'saved-view:read', action: 'read', scope: 'all' },
    { name: 'Write Saved Views', code: 'saved-view:write', action: 'write', scope: 'all' },
  ];

  private readonly deprecatedPluralCodes = [
    'purchase-orders:create',
    'purchase-orders:read',
    'purchase-orders:update',
    'purchase-orders:delete',
    'purchase-orders:approve',
    'purchase-orders:submit',
    'purchase-orders:send',
    'purchase-orders:receive',
    'purchase-orders:cancel',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of this.permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, name, code, action, scope, is_active, is_system_permission, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, true, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           action = EXCLUDED.action,
           scope = EXCLUDED.scope,
           is_active = true,
           updated_at = NOW()`,
        [permission.name, permission.code, permission.action, permission.scope],
      );
    }

    const placeholders = this.deprecatedPluralCodes.map((_, index) => `$${index + 1}`).join(', ');
    await queryRunner.query(
      `UPDATE permissions
         SET is_active = false, updated_at = NOW()
         WHERE code IN (${placeholders})`,
      this.deprecatedPluralCodes,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const newCodes = this.permissions.map((permission) => permission.code);
    const newPlaceholders = newCodes.map((_, index) => `$${index + 1}`).join(', ');

    await queryRunner.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT id FROM permissions WHERE code IN (${newPlaceholders})
       )`,
      newCodes,
    );
    await queryRunner.query(`DELETE FROM permissions WHERE code IN (${newPlaceholders})`, newCodes);

    const pluralPlaceholders = this.deprecatedPluralCodes
      .map((_, index) => `$${index + 1}`)
      .join(', ');
    await queryRunner.query(
      `UPDATE permissions
         SET is_active = true, updated_at = NOW()
         WHERE code IN (${pluralPlaceholders})`,
      this.deprecatedPluralCodes,
    );
  }
}
