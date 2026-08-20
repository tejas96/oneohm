import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the lookups table and per-project task_statuses JSONB.
 * Task status/priority catalogs now live in @tejas96/shared/constants/task-catalog.
 */
export class DropLookupsAndProjectTaskStatuses1855300000000 implements MigrationInterface {
  name = 'DropLookupsAndProjectTaskStatuses1855300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS task_statuses`);
    await queryRunner.query(`DROP TABLE IF EXISTS lookups CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally not reversible — lookups architecture removed from application code.
    await queryRunner.query(`SELECT 1`);
  }
}
