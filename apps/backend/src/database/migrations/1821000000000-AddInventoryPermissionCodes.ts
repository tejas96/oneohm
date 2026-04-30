import { type MigrationInterface, type QueryRunner } from 'typeorm';

type PermissionSeed = {
  name: string;
  code: string;
  action: string;
  scope: string;
};

/**
 * Adds inventory/bom/notification permission codes used by controller decorators.
 * This keeps IAM catalog aligned with runtime PermissionGuard checks.
 */
export class AddInventoryPermissionCodes1821000000000 implements MigrationInterface {
  name = 'AddInventoryPermissionCodes1821000000000';

  private readonly permissions: PermissionSeed[] = [
    { name: 'Write Inventory', code: 'inventory:write', action: 'write', scope: 'all' },
    {
      name: 'Write Purchase Orders',
      code: 'purchase-order:write',
      action: 'write',
      scope: 'all',
    },
    {
      name: 'Submit Purchase Orders',
      code: 'purchase-order:submit',
      action: 'submit',
      scope: 'all',
    },
    {
      name: 'Approve Purchase Orders',
      code: 'purchase-order:approve',
      action: 'approve',
      scope: 'all',
    },
    { name: 'Send Purchase Orders', code: 'purchase-order:send', action: 'send', scope: 'all' },
    {
      name: 'Receive Purchase Orders',
      code: 'purchase-order:receive',
      action: 'receive',
      scope: 'all',
    },
    { name: 'Adjust Stock', code: 'stock:adjust', action: 'adjust', scope: 'all' },
    { name: 'Transfer Stock', code: 'stock:transfer', action: 'transfer', scope: 'all' },
    { name: 'Write Allocations', code: 'allocation:write', action: 'write', scope: 'all' },
    { name: 'Write Dispatches', code: 'dispatch:write', action: 'write', scope: 'all' },
    { name: 'Read Notifications', code: 'notifications:read', action: 'read', scope: 'all' },
    { name: 'Read BOM', code: 'bom:read', action: 'read', scope: 'all' },
    { name: 'Finalize BOM', code: 'bom:finalize', action: 'finalize', scope: 'all' },
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = this.permissions.map((permission) => permission.code);
    const placeholders = codes.map((_, index) => `$${index + 1}`).join(', ');

    await queryRunner.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT id FROM permissions WHERE code IN (${placeholders})
       )`,
      codes,
    );

    await queryRunner.query(`DELETE FROM permissions WHERE code IN (${placeholders})`, codes);
  }
}
