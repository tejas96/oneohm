import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * DropServiceMaintenanceTables
 *
 * Removes the unused service & maintenance schema. The module had controllers
 * and entities but no web screens ever shipped against it, and all three tables
 * were confirmed empty before this ran, so there is no data to migrate into the
 * new service_tickets tables.
 *
 * Irreversible by design — `down` throws rather than recreating three tables
 * whose module no longer exists in the codebase.
 */
export class DropServiceMaintenanceTables1854000000000 implements MigrationInterface {
  name = 'DropServiceMaintenanceTables1854000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "maintenance_tasks" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "service_requests" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "project_maintenance_configs" CASCADE');
  }

  public async down(): Promise<void> {
    throw new Error(
      'DropServiceMaintenanceTables is irreversible — the service-maintenance module was deleted in the same change.',
    );
  }
}
