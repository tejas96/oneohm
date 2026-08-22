import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds `dashboard.business.view` — the code that reveals Business mode on the
 * dashboard, the organisation-wide counterpart to "My Work".
 *
 * The 44th code. `apps/web/lib/rbac/catalog.ts` is its mirror and the two are
 * kept in step by hand.
 *
 * `pipeline.view` was considered and rejected: it means "see the sales funnel",
 * and Business mode also shows org-wide cash, receivables and ageing. Reusing
 * it would have handed the company's money to everyone holding sales access.
 *
 * The money panels inside the mode are additionally gated on the existing
 * `finance.view`, so sales oversight can be granted without the cash position.
 * That is a web-side check; no code is needed for it here.
 *
 * `admin` and `super_admin` are deliberately NOT granted this row — they hold
 * no grants at all and pass by bypass.
 */
export class AddDashboardBusinessViewPermission1855600000000 implements MigrationInterface {
  name = 'AddDashboardBusinessViewPermission1855600000000';

  private readonly code = 'dashboard.business.view';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [
        this.code,
        'View Business Mode',
        'See the organisation-wide business overview on the dashboard',
        'dashboard',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code = $1`, [this.code]);
  }
}
