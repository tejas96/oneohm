import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: AddStockAllocationToProjectMaterials
 *
 * Adds stock_allocation_id FK to project_materials to link allocations
 * with project material records. Nullable because:
 * 1. Existing rows are "legacy/unlinked" — no backfill risk
 * 2. New rows get the FK set by MaterialService.updateStatus
 */
export class AddStockAllocationToProjectMaterials1814000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_materials
      ADD COLUMN IF NOT EXISTS stock_allocation_id UUID
        REFERENCES stock_allocations(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_materials_stock_allocation
      ON project_materials(stock_allocation_id)
      WHERE stock_allocation_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_materials_stock_allocation`);
    await queryRunner.query(
      `ALTER TABLE project_materials DROP COLUMN IF EXISTS stock_allocation_id`,
    );
  }
}
