import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds `workload.view` — the department workload screen and its summary card.
 *
 * A code of its own rather than `dashboard.business.view`: the grid lives at
 * its own route, `/workload`, which must gate independently of the dashboard.
 * Not `projects.view` either — that governs individual projects, and this is
 * organisation-wide team performance, which is a different thing to be
 * trusted with.
 */
export class AddWorkloadViewPermission1855800000000 implements MigrationInterface {
  name = 'AddWorkloadViewPermission1855800000000';

  private readonly code = 'workload.view';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING`,
      [
        this.code,
        'View Department Workload',
        'See how much work each department has pending and completed',
        'workload',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM permissions WHERE code = $1`, [this.code]);
  }
}
