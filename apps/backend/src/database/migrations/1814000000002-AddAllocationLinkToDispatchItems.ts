import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: AddAllocationLinkToDispatchItems
 *
 * Adds stock_allocation_id FK to material_dispatch_items.
 * Stays NULLABLE so backfill isn't required for existing rows.
 * Service enforces non-null for NEW dispatch items via DTO validation.
 */
export class AddAllocationLinkToDispatchItems1814000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE material_dispatch_items
      ADD COLUMN IF NOT EXISTS stock_allocation_id UUID
        REFERENCES stock_allocations(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_dispatch_items_allocation
      ON material_dispatch_items(stock_allocation_id)
      WHERE stock_allocation_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_dispatch_items_allocation`);
    await queryRunner.query(
      `ALTER TABLE material_dispatch_items DROP COLUMN IF EXISTS stock_allocation_id`,
    );
  }
}
