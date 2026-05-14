import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `BomEntity.allocationStatus` was added in code but never migrated.
 * Without this column, `GET /bom?entityType=project&entityId=...` fails at the DB layer.
 */
export class AddBomAllocationStatusColumn1831000000001 implements MigrationInterface {
  name = 'AddBomAllocationStatusColumn1831000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bom"
        ADD COLUMN IF NOT EXISTS "allocation_status" VARCHAR(20) NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(`
      ALTER TABLE "bom"
        ADD CONSTRAINT "chk_bom_allocation_status"
        CHECK ("allocation_status" IN ('pending', 'partial', 'fully_allocated'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bom" DROP CONSTRAINT IF EXISTS "chk_bom_allocation_status"`,
    );
    await queryRunner.query(`ALTER TABLE "bom" DROP COLUMN IF EXISTS "allocation_status"`);
  }
}
