import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §5.3 + §5.4 — the change log and the serials table.
 *
 * Purely additive. New columns are nullable and NOT backfilled here; Tasks 7
 * and 8 populate them, and Task 20 tightens them. Nothing reads any of this
 * yet, so this migration can ship on its own.
 *
 * The append-only trigger follows the ledger's pattern exactly
 * (sql/ledger/07-append-only.sql.ts), including its three hard-won details:
 * a trigger not a RULE (a RULE makes the write vanish while reporting
 * success), a separate statement-level trigger for TRUNCATE (row triggers do
 * not fire on it), and ENABLE ALWAYS (a plain trigger is skipped when
 * session_replication_role = 'replica', which restores and replication set).
 */
export class AddBomChangeLogAndSerials1856300000000 implements MigrationInterface {
  name = 'AddBomChangeLogAndSerials1856300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- new columns on bom (nullable for now) ----
    await queryRunner.query(`
      ALTER TABLE bom
        ADD COLUMN IF NOT EXISTS project_id UUID
          REFERENCES projects(id) ON DELETE RESTRICT,
        ADD COLUMN IF NOT EXISTS baseline_quote_version_id UUID
          REFERENCES quote_versions(id) ON DELETE SET NULL
    `);

    // ---- new columns on bom_items (nullable for now) ----
    await queryRunner.query(`
      ALTER TABLE bom_items
        ADD COLUMN IF NOT EXISTS quoted_quantity NUMERIC(12,3),
        ADD COLUMN IF NOT EXISTS unit_price_paise BIGINT,
        ADD COLUMN IF NOT EXISTS pricing_basis VARCHAR(20),
        ADD COLUMN IF NOT EXISTS source VARCHAR(10),
        ADD COLUMN IF NOT EXISTS created_by UUID,
        ADD COLUMN IF NOT EXISTS updated_by UUID
    `);

    // ---- serials ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bom_item_serials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bom_item_id UUID NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
        serial_number VARCHAR(100) NOT NULL,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_bom_item_serials UNIQUE (bom_item_id, serial_number),
        CONSTRAINT chk_bom_item_serials_format
          CHECK (serial_number ~ '^[A-Za-z0-9_/-]+$')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bom_item_serials_item ON bom_item_serials(bom_item_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bom_item_serials_number ON bom_item_serials(serial_number)`,
    );

    // ---- change log ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bom_changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bom_id UUID NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
        bom_item_id UUID REFERENCES bom_items(id) ON DELETE SET NULL,
        product_id UUID NOT NULL,
        change_type VARCHAR(10) NOT NULL,
        quantity_before NUMERIC(12,3),
        quantity_after NUMERIC(12,3),
        replaced_product_id UUID,
        unit_price_paise BIGINT NOT NULL,
        cost_impact_paise BIGINT NOT NULL,
        reason TEXT NOT NULL,
        source VARCHAR(10) NOT NULL,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT chk_bom_changes_type
          CHECK (change_type IN ('add','quantity','remove','replace')),
        CONSTRAINT chk_bom_changes_source
          CHECK (source IN ('quote','site','office')),
        CONSTRAINT chk_bom_changes_reason_present
          CHECK (length(trim(reason)) > 0),
        CONSTRAINT chk_bom_changes_replace_has_target
          CHECK (change_type <> 'replace' OR replaced_product_id IS NOT NULL)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bom_changes_bom_created
         ON bom_changes(bom_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bom_changes_bom_product
         ON bom_changes(bom_id, product_id)`,
    );

    // ---- append-only enforcement ----
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION bom_changes_forbid_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION
          'bom_changes is append-only: % is not permitted (id=%). Write a new change row instead.',
          TG_OP, COALESCE(OLD.id::text, '?')
          USING ERRCODE = '0A000';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_bom_changes_append_only
        BEFORE UPDATE OR DELETE ON bom_changes
        FOR EACH ROW EXECUTE FUNCTION bom_changes_forbid_mutation()
    `);
    await queryRunner.query(
      `ALTER TABLE bom_changes ENABLE ALWAYS TRIGGER trg_bom_changes_append_only`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_bom_changes_no_truncate
        BEFORE TRUNCATE ON bom_changes
        FOR EACH STATEMENT EXECUTE FUNCTION bom_changes_forbid_mutation()
    `);
    await queryRunner.query(
      `ALTER TABLE bom_changes ENABLE ALWAYS TRIGGER trg_bom_changes_no_truncate`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_bom_changes_no_truncate ON bom_changes`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_bom_changes_append_only ON bom_changes`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS bom_changes_forbid_mutation()`);
    await queryRunner.query(`DROP TABLE IF EXISTS bom_changes`);
    await queryRunner.query(`DROP TABLE IF EXISTS bom_item_serials`);
    await queryRunner.query(`
      ALTER TABLE bom_items
        DROP COLUMN IF EXISTS quoted_quantity,
        DROP COLUMN IF EXISTS unit_price_paise,
        DROP COLUMN IF EXISTS pricing_basis,
        DROP COLUMN IF EXISTS source,
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by
    `);
    await queryRunner.query(`
      ALTER TABLE bom
        DROP COLUMN IF EXISTS project_id,
        DROP COLUMN IF EXISTS baseline_quote_version_id
    `);
  }
}
