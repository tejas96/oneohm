import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds `dashboard.employees.view` — the code that lets a manager open another
 * employee's "My Work" dashboard.
 *
 * The catalog was deliberately reset to 42 codes by
 * 1855000000000-ResetRbacCatalog. This is the 43rd. `apps/web/lib/rbac/catalog.ts`
 * is its mirror and the two are kept in step by hand.
 *
 * `admin` and `super_admin` are deliberately NOT granted this row. They hold no
 * rows in `role_permissions` at all and pass by bypass instead. Granting it to
 * them would begin exactly the drift the bypass exists to prevent.
 *
 * Reversible, unlike ResetRbacCatalog: `down()` deletes the row, and
 * `role_permissions` cascades from `permissions`, so any grants go with it.
 */
export class AddDashboardEmployeesViewPermission1855500000000 implements MigrationInterface {
  name = 'AddDashboardEmployeesViewPermission1855500000000';

  private readonly code = 'dashboard.employees.view';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [
        this.code,
        'View Employee Dashboards',
        "See another employee's My Work dashboard",
        'dashboard',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code = $1`, [this.code]);
  }
}
