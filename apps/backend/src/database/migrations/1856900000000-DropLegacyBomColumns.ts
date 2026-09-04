import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §5.1 + §5.2 — remove what nothing reads and what lied.
 *
 * allocation_status is the notable one: findByEntity recomputed it from live
 * allocations on every read and OVERWROTE the loaded value before returning,
 * so the stored column disagreed with every answer the API ever gave. It is
 * still in the response — BomReadService derives it per request — but there is
 * nothing left to store.
 *
 * item_type goes too. Its values ('panel') never matched product_types.code
 * ('solar_panel'), and with a real product FK the type is one join away.
 *
 * This migration also discharges the three debts earlier transitional
 * migrations booked against Task 20 by name:
 *
 *   1856600000000  bom_items.source / pricing_basis / unit_price_paise
 *                  DEFAULTs — dropped below. They existed only so the
 *                  pre-Task-16 legacy writer, which supplied none of the
 *                  three, would not raise a not-null violation. That writer
 *                  is gone. A default on unit_price_paise is now a silent
 *                  wrong answer: a caller that forgets a price would book a
 *                  free line, which is exactly what the NOT NULL is for.
 *   1856750000000  bom.entity_type / entity_id — dropped below.
 *   1856760000000  bom_items.item_type / name  — dropped below.
 *
 * The product FK is the point of the task. BomItemEntity has declared
 * `onDelete: 'RESTRICT'` since Task 11, but no such constraint has ever
 * existed in the database — TypeORM only emits one under synchronize, which
 * this project does not run. RESTRICT is the guarantee that makes future
 * inventory integration safe: a product cannot be hard-deleted out from under
 * a BOM that requires it.
 *
 * The indexes and constraints that covered dropped columns — uq_bom_entity,
 * idx_bom_entity, chk_bom_allocation_status, idx_bom_items_type,
 * idx_bom_items_group_key, idx_bom_items_serial_number and
 * uq_bom_items_bom_serial — are removed by Postgres along with their columns
 * and are deliberately not recreated. Serial numbers moved to
 * bom_item_serials in Task 12 and carry their own uniqueness there.
 *
 * v_project_bom_variance (Task 19) reads bom.id / bom_number / project_id and
 * bom_items.bom_id / quantity / quoted_quantity / unit_price_paise — none of
 * them dropped here — so it does not block these drops and needs no rebuild.
 *
 * Runs last and is effectively irreversible: down() restores the SHAPE only.
 * Every value in a dropped column is gone for good. Ship and verify Tasks
 * 1-19 first.
 */
export class DropLegacyBomColumns1856900000000 implements MigrationInterface {
  name = 'DropLegacyBomColumns1856900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Guards -------------------------------------------------------
    // Every SET NOT NULL and the new FK below is checked here first, so a
    // dirty database aborts with the row count and the task that owns the
    // cleanup rather than a bare Postgres error mid-drop.
    const [counts] = (await queryRunner.query(`
      SELECT
        (SELECT COUNT(*)::int FROM bom WHERE project_id IS NULL)        AS bom_no_project,
        (SELECT COUNT(*)::int FROM bom_items WHERE product_id IS NULL)  AS item_no_product,
        (SELECT COUNT(*)::int FROM bom_items WHERE created_by IS NULL)  AS item_no_creator,
        (SELECT COUNT(*)::int FROM bom_items bi
           LEFT JOIN products p ON p.id = bi.product_id
          WHERE bi.product_id IS NOT NULL AND p.id IS NULL)             AS item_bad_product,
        (SELECT COUNT(*)::int FROM (
           SELECT project_id FROM bom GROUP BY project_id HAVING COUNT(*) > 1
         ) d)                                                           AS bom_dup_project,
        (SELECT COUNT(*)::int FROM bom_items
          WHERE quantity IS NOT NULL AND quantity < 0)                  AS item_neg_quantity,
        (SELECT COUNT(*)::int FROM bom_items
          WHERE pricing_basis IS NOT NULL
            AND pricing_basis NOT IN ('per_unit','per_watt','per_kw'))  AS item_bad_pricing_basis,
        (SELECT COUNT(*)::int FROM bom_items
          WHERE source IS NOT NULL
            AND source NOT IN ('quote','site','office'))                AS item_bad_source
    `)) as Array<{
      bom_no_project: number;
      item_no_product: number;
      item_no_creator: number;
      item_bad_product: number;
      bom_dup_project: number;
      item_neg_quantity: number;
      item_bad_pricing_basis: number;
      item_bad_source: number;
    }>;

    if (counts && counts.bom_no_project > 0) {
      throw new Error(
        `Cannot migrate: ${counts.bom_no_project} bom row(s) have no project_id. ` +
          `Task 8 reported these — delete them or repoint them first.`,
      );
    }
    if (counts && counts.item_no_product > 0) {
      throw new Error(
        `Cannot migrate: ${counts.item_no_product} bom_items row(s) have no product_id. ` +
          `product_id becomes NOT NULL and gains an FK here — resolve them first.`,
      );
    }
    if (counts && counts.item_no_creator > 0) {
      throw new Error(
        `Cannot migrate: ${counts.item_no_creator} bom_items row(s) have no created_by. ` +
          `created_by becomes NOT NULL here — resolve them first.`,
      );
    }
    if (counts && counts.item_bad_product > 0) {
      throw new Error(
        `Cannot migrate: ${counts.item_bad_product} bom_items row(s) reference a product ` +
          `that no longer exists. fk_bom_items_product would fail validation — resolve them first.`,
      );
    }
    if (counts && counts.bom_dup_project > 0) {
      throw new Error(
        `Cannot migrate: ${counts.bom_dup_project} project(s) have more than one bom row. ` +
          `uq_bom_project requires at most one per project — merge or delete the extras first.`,
      );
    }
    if (counts && counts.item_neg_quantity > 0) {
      throw new Error(
        `Cannot migrate: ${counts.item_neg_quantity} bom_items row(s) have a negative ` +
          `quantity. chk_bom_items_quantity_non_negative would fail validation — resolve them first.`,
      );
    }
    if (counts && counts.item_bad_pricing_basis > 0) {
      throw new Error(
        `Cannot migrate: ${counts.item_bad_pricing_basis} bom_items row(s) have a ` +
          `pricing_basis outside ('per_unit','per_watt','per_kw'). chk_bom_items_pricing_basis ` +
          `would fail validation — resolve them first.`,
      );
    }
    if (counts && counts.item_bad_source > 0) {
      throw new Error(
        `Cannot migrate: ${counts.item_bad_source} bom_items row(s) have a source outside ` +
          `('quote','site','office'). chk_bom_items_source would fail validation — resolve ` +
          `them first.`,
      );
    }

    // ---- bom ----------------------------------------------------------
    await queryRunner.query(`ALTER TABLE bom ALTER COLUMN project_id SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE bom
        DROP COLUMN IF EXISTS entity_type,
        DROP COLUMN IF EXISTS entity_id,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS total_items,
        DROP COLUMN IF EXISTS total_cost,
        DROP COLUMN IF EXISTS allocation_status,
        DROP COLUMN IF EXISTS organization_id
    `);
    // One BOM per project — the constraint BomEntity has declared since Task 11
    // (@Index(['projectId'], { unique: true })) and the database never had.
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_bom_project ON bom (project_id)`);

    // ---- bom_items: real product FK -----------------------------------
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN product_id SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE bom_items
        ADD CONSTRAINT fk_bom_items_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN created_by SET NOT NULL`);

    // ---- bom_items: discharge 1856600000000's transitional defaults ----
    // The legacy writer these covered for is gone. Keeping them would let a
    // caller that omits a column get a plausible wrong value instead of the
    // not-null violation the column is there to raise.
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN source DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN pricing_basis DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN unit_price_paise DROP DEFAULT`);

    // ---- bom_items: drop the legacy columns ---------------------------
    await queryRunner.query(`
      ALTER TABLE bom_items
        DROP COLUMN IF EXISTS item_type,
        DROP COLUMN IF EXISTS name,
        DROP COLUMN IF EXISTS brand,
        DROP COLUMN IF EXISTS specifications,
        DROP COLUMN IF EXISTS warranty_years,
        DROP COLUMN IF EXISTS gst_rate,
        DROP COLUMN IF EXISTS gst_amount,
        DROP COLUMN IF EXISTS serial_number,
        DROP COLUMN IF EXISTS group_key,
        DROP COLUMN IF EXISTS unit_index,
        DROP COLUMN IF EXISTS unit_price,
        DROP COLUMN IF EXISTS total_price
    `);
    await queryRunner.query(`
      ALTER TABLE bom_items
        ADD CONSTRAINT chk_bom_items_quantity_non_negative CHECK (quantity >= 0),
        ADD CONSTRAINT chk_bom_items_pricing_basis
          CHECK (pricing_basis IN ('per_unit','per_watt','per_kw')),
        ADD CONSTRAINT chk_bom_items_source
          CHECK (source IN ('quote','site','office'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Shape only — the dropped values are gone. A restored entity_type /
    // entity_id pair is reconstructed from project_id below because that is
    // the one mapping the old data provably had; nothing else is invented.
    await queryRunner.query(`
      ALTER TABLE bom_items
        DROP CONSTRAINT IF EXISTS chk_bom_items_source,
        DROP CONSTRAINT IF EXISTS chk_bom_items_pricing_basis,
        DROP CONSTRAINT IF EXISTS chk_bom_items_quantity_non_negative,
        DROP CONSTRAINT IF EXISTS fk_bom_items_product
    `);
    await queryRunner.query(`
      ALTER TABLE bom_items
        ADD COLUMN IF NOT EXISTS item_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
        ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS warranty_years INTEGER,
        ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(15,2),
        ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS group_key VARCHAR(64),
        ADD COLUMN IF NOT EXISTS unit_index INTEGER,
        ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2),
        ADD COLUMN IF NOT EXISTS total_price DECIMAL(15,2)
    `);
    // Restore 1856600000000's defaults: reverting past this migration puts the
    // legacy writer back in play, and it supplies none of these three.
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN unit_price_paise SET DEFAULT 0`);
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN pricing_basis SET DEFAULT 'per_unit'`,
    );
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN source SET DEFAULT 'quote'`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN created_by DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN product_id DROP NOT NULL`);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_bom_project`);
    await queryRunner.query(`
      ALTER TABLE bom
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS entity_id UUID,
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'finalized',
        ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_cost DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS allocation_status VARCHAR(20) DEFAULT 'pending'
    `);
    await queryRunner.query(`UPDATE bom SET entity_type = 'project', entity_id = project_id`);
    await queryRunner.query(`ALTER TABLE bom ALTER COLUMN project_id DROP NOT NULL`);
  }
}
