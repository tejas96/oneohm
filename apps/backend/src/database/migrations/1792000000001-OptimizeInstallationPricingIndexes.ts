import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeInstallationPricingIndexes1792000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite index optimized for the primary query path:
    // findBySystemSize(orgId, sizeKw) -> filters on org, is_active, then range check on min_system_size_kw
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ip_org_active_size"
      ON installation_pricing (organization_id, is_active, min_system_size_kw DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ip_org_active_size"
    `);
  }
}
