import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §5.2 + §5.3 — one bom_items row per product.
 *
 * appendBomLineItems exploded serialized types into one row per unit, keyed by
 * group_key + unit_index, splitting money with splitMoneyEvenly. A 12-panel
 * BOM was 12 rows, and a quantity change shuffled them hard enough that an
 * in-flight serial edit could 404 (the web hook still carries a branch for it).
 *
 * This collapses them: quantities sum onto one surviving row, serials move to
 * bom_item_serials, money becomes paise, and pricing_basis is stamped from the
 * product type.
 *
 * MONEY: splitMoneyEvenly put each unit's SHARE of the line on its own row, so
 * a 164-panel line is 164 rows of total_price = 1/164th each. The line's real
 * value is therefore SUM(total_price) over the group, not the survivor's own
 * total_price. Both the summed quantity and the summed money are carried on
 * the merge table and written to the survivor together; deriving a unit price
 * from the survivor's own total_price against the summed quantity would drop
 * everything the merged-away rows were holding.
 *
 * total_price stays authoritative here — unit_price was sometimes a per-unit
 * split and sometimes a whole-system total, so unit_price_paise is derived
 * from total_price. The legacy unit_price / total_price / gst_amount columns
 * are restated on the survivor as well, so the pre-rebuild read path (which
 * still sums bom_items.total_price) keeps reporting the same BOM totals until
 * those columns are dropped.
 *
 * per_kw lines are restated: today a structure sits as quantity 1 with the
 * whole-system total as its "unit price", so editing that quantity means
 * nothing. Quantity becomes kW and the price becomes rupees per kW.
 */
export class CollapseBomItemRows1856400000000 implements MigrationInterface {
  name = 'CollapseBomItemRows1856400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 0. Lines with no product cannot survive "physical items only" ---
    const orphans = (await queryRunner.query(
      `SELECT COUNT(*)::int AS n FROM bom_items WHERE product_id IS NULL`,
    )) as Array<{ n: number }>;
    if (orphans[0] && orphans[0].n > 0) {
      console.warn(
        `[migration] Deleting ${orphans[0].n} bom_items row(s) with no product_id — ` +
          `they cannot become catalog-backed BOM lines.`,
      );
      await queryRunner.query(`DELETE FROM bom_items WHERE product_id IS NULL`);
    }

    // --- 1. Move every serial onto its own row, before rows are merged away ---
    await queryRunner.query(`
      INSERT INTO bom_item_serials (bom_item_id, serial_number, created_by, created_at)
      SELECT bi.id,
             bi.serial_number,
             b.created_by,
             bi.created_at
        FROM bom_items bi
        JOIN bom b ON b.id = bi.bom_id
       WHERE bi.serial_number IS NOT NULL
         AND trim(bi.serial_number) <> ''
         AND bi.serial_number ~ '^[A-Za-z0-9_/-]+$'
      ON CONFLICT (bom_item_id, serial_number) DO NOTHING
    `);

    // Any serial the CHECK constraint would reject is reported, not silently lost.
    const rejected = (await queryRunner.query(`
      SELECT bi.id, bi.serial_number
        FROM bom_items bi
       WHERE bi.serial_number IS NOT NULL
         AND trim(bi.serial_number) <> ''
         AND bi.serial_number !~ '^[A-Za-z0-9_/-]+$'
    `)) as Array<{ id: string; serial_number: string }>;
    for (const r of rejected) {
      console.warn(
        `[migration] Serial '${r.serial_number}' on bom_item ${r.id} has characters the ` +
          `new format check rejects; not migrated. Re-enter it in the UI.`,
      );
    }

    // --- 2. Pick a survivor per (bom_id, product_id) and total up the group ---
    // Lowest sort_order then oldest wins, so the BOM keeps its display order.
    await queryRunner.query(`
      CREATE TEMP TABLE bom_item_merge AS
      SELECT bi.id                                            AS survivor_id,
             bi.bom_id,
             bi.product_id,
             agg.total_qty,
             agg.total_price,
             agg.total_gst,
             agg.member_ids
        FROM (
          SELECT bom_id,
                 product_id,
                 SUM(quantity)::numeric                  AS total_qty,
                 SUM(COALESCE(total_price, 0))::numeric  AS total_price,
                 SUM(COALESCE(gst_amount, 0))::numeric   AS total_gst,
                 array_agg(id)                           AS member_ids,
                 (array_agg(id ORDER BY sort_order ASC, created_at ASC, id ASC))[1]
                                                         AS keep_id
            FROM bom_items
           GROUP BY bom_id, product_id
        ) agg
        JOIN bom_items bi ON bi.id = agg.keep_id
    `);

    // Two rows in the same group can carry the same serial, and re-pointing
    // both at the survivor would violate uq_bom_item_serials and roll the
    // whole migration back. Drop the losers first, naming each one. Prefer
    // whatever already sits on the survivor, then the oldest id.
    await queryRunner.query(`
      CREATE TEMP TABLE bom_item_serial_dupes AS
      WITH mapped AS (
        SELECT s.id,
               s.bom_item_id,
               s.serial_number,
               COALESCE(m.survivor_id, s.bom_item_id) AS target_id
          FROM bom_item_serials s
          LEFT JOIN bom_item_merge m ON s.bom_item_id = ANY(m.member_ids)
      ),
      ranked AS (
        SELECT id,
               bom_item_id,
               serial_number,
               target_id,
               ROW_NUMBER() OVER (
                 PARTITION BY target_id, serial_number
                 ORDER BY (bom_item_id = target_id) DESC, id ASC
               ) AS rn
          FROM mapped
      )
      SELECT id, bom_item_id, serial_number, target_id
        FROM ranked
       WHERE rn > 1
    `);

    const dupes = (await queryRunner.query(`
      SELECT id, bom_item_id, serial_number, target_id FROM bom_item_serial_dupes
    `)) as Array<{
      id: string;
      bom_item_id: string;
      serial_number: string;
      target_id: string;
    }>;
    for (const d of dupes) {
      console.warn(
        `[migration] Serial '${d.serial_number}' on bom_item ${d.bom_item_id} duplicates one ` +
          `already merging onto bom_item ${d.target_id}; dropping the duplicate. ` +
          `Re-enter it in the UI if both units are real.`,
      );
    }

    await queryRunner.query(`
      DELETE FROM bom_item_serials s
       USING bom_item_serial_dupes d
       WHERE s.id = d.id
    `);
    await queryRunner.query(`DROP TABLE bom_item_serial_dupes`);

    await queryRunner.query(`
      UPDATE bom_item_serials s
         SET bom_item_id = m.survivor_id
        FROM bom_item_merge m
       WHERE s.bom_item_id = ANY(m.member_ids)
         AND s.bom_item_id <> m.survivor_id
    `);

    // --- 3. Widen quantity before the summed value lands on it ---
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN quantity TYPE NUMERIC(12,3)`,
    );

    // --- 4. Sum quantity AND money onto the survivor ---
    // The money has to move with the quantity: the merged-away rows each held
    // their own share of the line, and that share is about to be deleted.
    await queryRunner.query(`
      UPDATE bom_items bi
         SET quantity    = m.total_qty,
             total_price = m.total_price,
             gst_amount  = m.total_gst,
             unit_price  = CASE
                             WHEN m.total_qty > 0
                               THEN ROUND(m.total_price / m.total_qty, 2)
                             ELSE m.total_price
                           END
        FROM bom_item_merge m
       WHERE bi.id = m.survivor_id
    `);

    // --- 5. Delete the merged-away rows ---
    await queryRunner.query(`
      DELETE FROM bom_items bi
       USING bom_item_merge m
       WHERE bi.bom_id = m.bom_id
         AND bi.product_id = m.product_id
         AND bi.id <> m.survivor_id
    `);

    await queryRunner.query(`DROP TABLE bom_item_merge`);

    // --- 6. Stamp basis, convert money to paise ---
    await queryRunner.query(`
      UPDATE bom_items bi
         SET pricing_basis = COALESCE(pt.default_pricing_basis, 'per_unit')
        FROM products p
        JOIN product_types pt ON pt.id = p.product_type_id
       WHERE p.id = bi.product_id
    `);
    await queryRunner.query(`
      UPDATE bom_items SET pricing_basis = 'per_unit' WHERE pricing_basis IS NULL
    `);

    // A non-positive quantity cannot carry the line's money: quantity *
    // unit_price_paise is 0 for a qty-0 row and negative for a negative one.
    // Legacy total_price would mask that until Task 16 stops reading it, at
    // which point the line's value would vanish with no warning. So decide it
    // here, out loud, instead of letting an ELSE branch swallow it.
    const nonPositive = (await queryRunner.query(`
      SELECT id,
             bom_id,
             quantity::text                  AS quantity,
             COALESCE(total_price, 0)::text  AS total_price
        FROM bom_items
       WHERE quantity <= 0
       ORDER BY bom_id, id
    `)) as Array<{
      id: string;
      bom_id: string;
      quantity: string;
      total_price: string;
    }>;

    if (nonPositive.length > 0) {
      const bomIds = [...new Set(nonPositive.map((r) => r.bom_id))];
      console.warn(
        `[migration] ${nonPositive.length} bom_items row(s) have quantity <= 0, across ` +
          `${bomIds.length} BOM(s): ${bomIds.join(', ')}`,
      );

      const withMoney = nonPositive.filter((r) => Number(r.total_price) !== 0);
      if (withMoney.length > 0) {
        const offenders = withMoney
          .map(
            (r) =>
              `${r.id} (bom ${r.bom_id}, quantity ${r.quantity}, ` +
              `total_price ${r.total_price})`,
          )
          .join('; ');
        throw new Error(
          `[migration] Refusing to continue: ${withMoney.length} bom_items row(s) carry money ` +
            `on a non-positive quantity, so quantity * unit_price_paise cannot reproduce ` +
            `total_price and the money would be silently lost. Correct the quantity or remove ` +
            `the row, then re-run. Offending rows: ${offenders}`,
        );
      }

      console.warn(
        `[migration] All of them carry total_price = 0, so no money is at stake; ` +
          `their unit_price_paise is set to 0.`,
      );
    }

    // total_price is authoritative in the old data (unit_price was sometimes a
    // per-unit split and sometimes a system total), so derive from it. By now
    // total_price holds the whole group's money, not one unit's share. The
    // guard above has already proved the ELSE branch carries no money.
    await queryRunner.query(`
      UPDATE bom_items
         SET unit_price_paise = CASE
               WHEN quantity > 0 THEN ROUND(COALESCE(total_price, 0) * 100 / quantity)
               ELSE 0
             END
    `);

    // --- 7. Restate per_kw lines as quantity-in-kW at rupees per kW ---
    // Some project BOMs cannot resolve a system size, so their per_kw line is
    // left in the old shape. That is the one branch here that actually fires
    // on real data, so it must not be the silent one.
    const unresolved = (await queryRunner.query(`
      SELECT b.id AS bom_id,
             b.bom_number,
             CASE
               WHEN pr.id IS NULL
                 THEN 'bom.entity_id points at no projects row (dangling reference)'
               WHEN pr.contract_quote_version_id IS NULL
                 THEN 'project has no contract_quote_version_id'
               WHEN qv.id IS NULL
                 THEN 'contract quote version row is missing'
               ELSE 'contract quote version has total_wattage_wp <= 0'
             END AS reason
        FROM bom b
        LEFT JOIN projects pr ON pr.id = b.entity_id
        LEFT JOIN quote_versions qv ON qv.id = pr.contract_quote_version_id
       WHERE b.entity_type = 'project'
         AND COALESCE(qv.total_wattage_wp, 0) <= 0
         AND EXISTS (
           SELECT 1
             FROM bom_items bi
            WHERE bi.bom_id = b.id
              AND bi.pricing_basis = 'per_kw'
              AND bi.quantity = 1
         )
       ORDER BY b.bom_number
    `)) as Array<{ bom_id: string; bom_number: string; reason: string }>;
    for (const u of unresolved) {
      console.warn(
        `[migration] BOM ${u.bom_number} (${u.bom_id}) has a per_kw line but no resolvable ` +
          `system size — ${u.reason}. Left at quantity 1 with the whole-system total as its ` +
          `unit price; not restated.`,
      );
    }

    // The old shape was quantity 1 with the whole-system total as unit price,
    // so at quantity 1 unit_price_paise IS the line total.
    // system_size_kw comes from the project's contract quote version.
    await queryRunner.query(`
      UPDATE bom_items bi
         SET quantity         = GREATEST(sz.size_kw, 0.001),
             unit_price_paise = ROUND(bi.unit_price_paise / GREATEST(sz.size_kw, 0.001)),
             unit_price       = ROUND(COALESCE(bi.total_price, 0) / GREATEST(sz.size_kw, 0.001), 2)
        FROM (
          SELECT b.id AS bom_id,
                 (qv.total_wattage_wp::numeric / 1000) AS size_kw
            FROM bom b
            JOIN projects pr ON pr.id = b.entity_id AND b.entity_type = 'project'
            JOIN quote_versions qv ON qv.id = pr.contract_quote_version_id
           WHERE qv.total_wattage_wp > 0
        ) sz
       WHERE bi.bom_id = sz.bom_id
         AND bi.pricing_basis = 'per_kw'
         AND bi.quantity = 1
    `);

    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN unit_price_paise SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN pricing_basis SET NOT NULL`,
    );

    // --- 8. One row per product, from here on ---
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_bom_items_bom_product ON bom_items (bom_id, product_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The row explosion is not reconstructible — the per-unit split is gone.
    // This restores the shape so the chain stays valid.
    await queryRunner.query(`DROP INDEX IF EXISTS uq_bom_items_bom_product`);
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN pricing_basis DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN unit_price_paise DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN quantity TYPE INTEGER USING ROUND(quantity)::integer`,
    );
  }
}
