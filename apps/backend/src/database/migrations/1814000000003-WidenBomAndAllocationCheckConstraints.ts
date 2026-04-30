import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: WidenBomAndAllocationCheckConstraints
 *
 * 1. Widen bom.status CHECK to include 'ALLOCATED' status
 *    (column stays VARCHAR — zero Postgres ENUMs)
 * 2. Widen stock_allocations.source_type CHECK to include 'bom'
 *    (allows BOM-finalize-created allocations to have source_type='bom')
 *
 * Pattern: drop existing CHECK → re-add widened CHECK
 */
export class WidenBomAndAllocationCheckConstraints1814000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Widen bom.status CHECK
    // ============================================================
    const hasBomsTable = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'boms'
    `);
    if (hasBomsTable.length > 0) {
      const bomStatusConstraint = await queryRunner.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'boms' AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%status%'
      `);
      for (const constraint of bomStatusConstraint) {
        await queryRunner.query(
          `ALTER TABLE boms DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`,
        );
      }

      // Add widened status CHECK for boms (includes ALLOCATED and CANCELLED)
      await queryRunner.query(`
        ALTER TABLE boms
        ADD CONSTRAINT chk_boms_status
        CHECK (status IN ('draft', 'finalized', 'allocated', 'cancelled', 'DRAFT', 'FINALIZED', 'ALLOCATED', 'CANCELLED'))
      `);
    }

    // ============================================================
    // 2. Widen stock_allocations.source_type CHECK to include 'bom'
    // ============================================================
    const sourceTypeConstraint = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'stock_allocations' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%source_type%'
    `);
    for (const constraint of sourceTypeConstraint) {
      await queryRunner.query(
        `ALTER TABLE stock_allocations DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD CONSTRAINT chk_stock_allocations_source_type
      CHECK (source_type IN ('own', 'third_party', 'bom'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore narrow source_type CHECK
    await queryRunner.query(
      `ALTER TABLE stock_allocations DROP CONSTRAINT IF EXISTS chk_stock_allocations_source_type`,
    );
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD CONSTRAINT chk_stock_allocations_source_type
      CHECK (source_type IN ('own', 'third_party'))
    `);

    // Restore narrow bom.status CHECK if boms table exists
    const hasBomsTable = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'boms'
    `);
    if (hasBomsTable.length > 0) {
      await queryRunner.query(`ALTER TABLE boms DROP CONSTRAINT IF EXISTS chk_boms_status`);
    }
  }
}
