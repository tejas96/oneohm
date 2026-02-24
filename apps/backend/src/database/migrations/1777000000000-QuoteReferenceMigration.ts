import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Quote Reference Migration
 *
 * Adds a proper quote_id FK on projects, moves actualCost into metadata,
 * cleans redundant metadata keys, and drops the duplicated columns
 * (system_size_kw, project_type, estimated_cost, actual_cost).
 */
export class QuoteReferenceMigration1777000000000 implements MigrationInterface {
  name = 'QuoteReferenceMigration1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add quote_id column (nullable initially)
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN quote_id UUID;
    `);

    // Step 2: Populate quote_id from metadata.quoteId
    await queryRunner.query(`
      UPDATE projects SET quote_id = (metadata->>'quoteId')::uuid
      WHERE metadata->>'quoteId' IS NOT NULL;
    `);

    // Step 3: Move actual_cost into metadata.actualCost
    await queryRunner.query(`
      UPDATE projects SET metadata = jsonb_set(
        COALESCE(metadata, '{}'), '{actualCost}', to_jsonb(actual_cost)
      ) WHERE actual_cost IS NOT NULL;
    `);

    // Step 4: Clean redundant metadata keys
    await queryRunner.query(`
      UPDATE projects SET metadata = metadata - 'quoteId' - 'quoteNumber'
        - 'convertedFromQuote' - 'originalQuoteAmount'
      WHERE metadata IS NOT NULL;
    `);

    // Step 5a: Check for active orphan projects (no quote_id)
    const activeOrphans = await queryRunner.query(`
      SELECT id, project_number FROM projects WHERE quote_id IS NULL AND deleted_at IS NULL;
    `);

    if (activeOrphans.length > 0) {
      const orphanList = activeOrphans
        .map((o: { id: string; project_number: string }) => `${o.project_number} (${o.id})`)
        .join(', ');
      console.warn(
        `[QuoteReferenceMigration] Found ${activeOrphans.length} active projects without quote_id: ${orphanList}. Soft-deleting.`,
      );
      await queryRunner.query(`
        UPDATE projects SET deleted_at = NOW() WHERE quote_id IS NULL AND deleted_at IS NULL;
      `);
    }

    // Step 5b: Remove already-soft-deleted orphans that have no quote_id.
    // NOT NULL applies to ALL rows including soft-deleted; hard-delete these
    // since they are already logically removed.
    const deletedOrphans = await queryRunner.query(`
      SELECT id, project_number FROM projects WHERE quote_id IS NULL AND deleted_at IS NOT NULL;
    `);

    if (deletedOrphans.length > 0) {
      console.warn(
        `[QuoteReferenceMigration] Found ${deletedOrphans.length} already-deleted projects without quote_id. Hard-deleting.`,
      );
      await queryRunner.query(`
        DELETE FROM projects WHERE quote_id IS NULL AND deleted_at IS NOT NULL;
      `);
    }

    // Step 6: Make quote_id NOT NULL + add FK constraint
    await queryRunner.query(`
      ALTER TABLE projects ALTER COLUMN quote_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE projects ADD CONSTRAINT fk_projects_quote
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT;
    `);

    // Step 7: Create index on quote_id for JOIN performance
    await queryRunner.query(`
      CREATE INDEX idx_projects_quote_id ON projects(quote_id);
    `);

    // Step 8: Drop old columns
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS system_size_kw;`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS project_type;`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS estimated_cost;`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS actual_cost;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add old columns
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN system_size_kw DECIMAL(10,2);
    `);
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN project_type VARCHAR(50);
    `);
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN estimated_cost DECIMAL(12,2);
    `);
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN actual_cost DECIMAL(12,2);
    `);

    // Restore data from quote relation
    await queryRunner.query(`
      UPDATE projects p SET
        system_size_kw = q.system_size_kw,
        project_type = q.project_type,
        estimated_cost = q.final_price
      FROM quotes q WHERE p.quote_id = q.id;
    `);

    // Restore actual_cost from metadata
    await queryRunner.query(`
      UPDATE projects SET actual_cost = (metadata->>'actualCost')::decimal
      WHERE metadata->>'actualCost' IS NOT NULL;
    `);

    // Drop FK, index, and column
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_quote_id;`);
    await queryRunner.query(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_quote;`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS quote_id;`);
  }
}
