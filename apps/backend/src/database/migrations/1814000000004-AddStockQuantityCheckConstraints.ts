import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: AddStockQuantityCheckConstraints
 *
 * Adds CHECK constraints to prevent negative stock quantities.
 * These guard against application bugs — DB should enforce data integrity.
 */
export class AddStockQuantityCheckConstraints1814000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE inventory_stock
      ADD CONSTRAINT chk_inventory_stock_available_non_negative
      CHECK (available_quantity >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_stock
      ADD CONSTRAINT chk_inventory_stock_reserved_non_negative
      CHECK (reserved_quantity >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_stock
      ADD CONSTRAINT chk_inventory_stock_in_transit_non_negative
      CHECK (in_transit_quantity >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS chk_inventory_stock_available_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS chk_inventory_stock_reserved_non_negative`,
    );
    await queryRunner.query(
      `ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS chk_inventory_stock_in_transit_non_negative`,
    );
  }
}
