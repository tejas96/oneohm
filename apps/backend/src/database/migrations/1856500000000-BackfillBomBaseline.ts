import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §6.2 — the baseline, and a log that reconciles from day one.
 *
 * Every existing BOM line is treated as quoted: quoted_quantity = quantity and
 * source = 'quote'. That is true by construction, because until now the only
 * writer was the quote calculation.
 *
 * One 'add' change row per line is written too. Without it the log would start
 * empty while the BOM already had value, and Task 19's assertion — variance
 * from the columns must equal variance from the log — could never hold.
 *
 * baseline_quote_version_id comes from projects.contract_quote_version_id, the
 * column that already exists to stop readers re-pricing a signed deal from the
 * latest quote version. The BOM had the same defect via syncBomFromSnapshot.
 *
 * THE INVARIANT this migration establishes, per project BOM:
 *
 *   SUM(bom_changes.cost_impact_paise)
 *     = SUM(ROUND(bom_items.quantity * bom_items.unit_price_paise))
 *
 * The ROUND is not cosmetic. cost_impact_paise is BIGINT and quantity is
 * NUMERIC(12,3), so the product carries up to three decimal places that the
 * column cannot hold. The identity therefore only closes against the
 * PER-ROW-ROUNDED sum; comparing against the raw product drifts on 81 of the
 * 150 project BOMs in this dataset. Task 19 must assert the rounded form.
 *
 * Two departures from the drafted brief, both deliberate:
 *
 *   1. Dangling BOMs are DELETED, not nulled. bom.project_id already carries
 *      an FK to projects(id) (Task 6), so a dangling project_id is not merely
 *      undesirable — it is unrepresentable, and the brief's "set project_id
 *      then clear the ones that dangle" sequence would have died on the FK
 *      before its own cleanup could run. Detection here is against entity_id,
 *      the polymorphic reference, which is the only place the danglers can be
 *      seen. Task 20 makes project_id NOT NULL, so nulling them would only
 *      relocate the blockage.
 *
 *   2. bom_changes' two FKs are re-pointed to ON DELETE RESTRICT. Task 6 gave
 *      bom_item_id ON DELETE SET NULL and bom_id ON DELETE CASCADE; the
 *      ENABLE ALWAYS append-only trigger rejects both the UPDATE that SET NULL
 *      needs and the DELETE that CASCADE needs, so either referential action
 *      surfaced as a 0A000 "bom_changes is append-only" complaint about a
 *      table the developer was not touching. RESTRICT costs nothing — the
 *      design never deletes a bom_item (removal sets quantity = 0) and never
 *      deletes a bom — and buys a named, honest FK violation instead. This is
 *      the ledger_entries pattern.
 */
export class BackfillBomBaseline1856500000000 implements MigrationInterface {
  name = 'BackfillBomBaseline1856500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 0. Remove BOMs whose project no longer exists ---------------------
    // Detected on entity_id, not project_id: project_id has an FK, so it can
    // never hold a dangling value in the first place.
    const dangling = (await queryRunner.query(`
      SELECT b.id, b.bom_number, b.entity_id
        FROM bom b
        LEFT JOIN projects p ON p.id = b.entity_id
       WHERE b.entity_type = 'project'
         AND p.id IS NULL
       ORDER BY b.bom_number
    `)) as Array<{ id: string; bom_number: string; entity_id: string }>;

    if (dangling.length > 0) {
      const ids = dangling.map((d) => d.id);

      // Refuse to delete anything another table still leans on. A BOM with
      // allocations, returns or change history is not unreachable debris, and
      // this migration is not the place to decide what to do with it.
      const refRows = (await queryRunner.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM bom_items        WHERE bom_id = ANY($1::uuid[])) AS items,
          (SELECT COUNT(*)::int FROM stock_allocations WHERE bom_id = ANY($1::uuid[])) AS allocations,
          (SELECT COUNT(*)::int FROM bom_changes      WHERE bom_id = ANY($1::uuid[])) AS changes,
          (SELECT COUNT(*)::int FROM return_requests  WHERE bom_id = ANY($1::uuid[])) AS returns
      `,
        [ids],
      )) as Array<{
        items: number;
        allocations: number;
        changes: number;
        returns: number;
      }>;
      const refs = refRows[0] ?? { items: 0, allocations: 0, changes: 0, returns: 0 };

      if (refs.allocations > 0 || refs.changes > 0 || refs.returns > 0) {
        throw new Error(
          `[migration] Refusing to delete ${dangling.length} BOM(s) with a missing project: ` +
            `they are still referenced (${refs.allocations} stock allocation(s), ` +
            `${refs.changes} change row(s), ${refs.returns} return request(s)). ` +
            `Resolve those references by hand, then re-run.`,
        );
      }

      for (const d of dangling) {
        console.warn(
          `[migration] BOM ${d.bom_number} (${d.id}) references project ${d.entity_id}, ` +
            `which no longer exists. Nothing can render or allocate against it; deleting.`,
        );
      }

      // Counted before the fact, not from a RETURNING clause: TypeORM's Postgres
      // driver hands back [rows, rowCount] for DELETE, so `.length` on the raw
      // result is 2 no matter how many rows went.
      await queryRunner.query(`DELETE FROM bom_items WHERE bom_id = ANY($1::uuid[])`, [ids]);
      await queryRunner.query(`DELETE FROM bom WHERE id = ANY($1::uuid[])`, [ids]);

      console.warn(
        `[migration] Deleted ${refs.items} bom_items row(s) and ` +
          `${dangling.length} bom row(s) for projects that no longer exist.`,
      );
    }

    // --- 1. project_id from the polymorphic reference -----------------------
    await queryRunner.query(`
      UPDATE bom SET project_id = entity_id
       WHERE entity_type = 'project' AND project_id IS NULL
    `);

    // --- 2. baseline from the pinned contract version -----------------------
    // The EXISTS guard keeps a stale contract_quote_version_id from failing
    // bom_baseline_quote_version_id_fkey; such a BOM just stays unpinned and
    // is counted by the warning below.
    await queryRunner.query(`
      UPDATE bom b
         SET baseline_quote_version_id = p.contract_quote_version_id
        FROM projects p
       WHERE p.id = b.project_id
         AND p.contract_quote_version_id IS NOT NULL
         AND b.baseline_quote_version_id IS NULL
         AND EXISTS (
           SELECT 1 FROM quote_versions qv WHERE qv.id = p.contract_quote_version_id
         )
    `);

    const unpinned = (await queryRunner.query(`
      SELECT COUNT(*)::int AS n FROM bom
       WHERE project_id IS NOT NULL AND baseline_quote_version_id IS NULL
    `)) as Array<{ n: number }>;
    if (unpinned[0] && unpinned[0].n > 0) {
      console.warn(
        `[migration] ${unpinned[0].n} project BOM(s) have no contract_quote_version_id, ` +
          `so no baseline. Their quoted figures fall back to quoted_quantity on the ` +
          `item rows, which this migration sets. Re-baseline them from the UI when a ` +
          `version is pinned.`,
      );
    }

    // --- 3. Every existing line was quoted ----------------------------------
    // No entity_type filter: source becomes NOT NULL below, so quote_version
    // BOMs' items need it too, even though Task 10 deletes those BOMs.
    await queryRunner.query(`
      UPDATE bom_items
         SET quoted_quantity = quantity,
             source = 'quote'
       WHERE source IS NULL
    `);

    await queryRunner.query(`
      UPDATE bom_items bi
         SET created_by = b.created_by,
             updated_by = b.created_by
        FROM bom b
       WHERE b.id = bi.bom_id AND bi.created_by IS NULL
    `);

    // --- 4. Seed the log so it reconciles -----------------------------------
    // cost_impact_paise is rounded PER ROW, which is what makes the invariant
    // in the header comment exact rather than approximate.
    await queryRunner.query(`
      INSERT INTO bom_changes
        (bom_id, bom_item_id, product_id, change_type, quantity_before,
         quantity_after, unit_price_paise, cost_impact_paise, reason, source,
         created_by, created_at)
      SELECT bi.bom_id,
             bi.id,
             bi.product_id,
             'add',
             NULL,
             bi.quantity,
             bi.unit_price_paise,
             ROUND(bi.quantity * bi.unit_price_paise),
             'Seeded from the accepted quotation',
             'quote',
             COALESCE(bi.created_by, b.created_by),
             COALESCE(bi.created_at, b.created_at, CURRENT_TIMESTAMP)
        FROM bom_items bi
        JOIN bom b ON b.id = bi.bom_id
       WHERE b.entity_type = 'project'
         AND NOT EXISTS (
           SELECT 1 FROM bom_changes c WHERE c.bom_item_id = bi.id
         )
    `);

    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN source SET NOT NULL`);

    // --- 5. Make the change log's FKs tell the truth ------------------------
    // Runs AFTER the step-0 deletions, which RESTRICT would otherwise block.
    await queryRunner.query(
      `ALTER TABLE bom_changes DROP CONSTRAINT IF EXISTS bom_changes_bom_item_id_fkey`,
    );
    await queryRunner.query(`
      ALTER TABLE bom_changes
        ADD CONSTRAINT bom_changes_bom_item_id_fkey
        FOREIGN KEY (bom_item_id) REFERENCES bom_items(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `ALTER TABLE bom_changes DROP CONSTRAINT IF EXISTS bom_changes_bom_id_fkey`,
    );
    await queryRunner.query(`
      ALTER TABLE bom_changes
        ADD CONSTRAINT bom_changes_bom_id_fkey
        FOREIGN KEY (bom_id) REFERENCES bom(id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore Task 6's referential actions so the chain lands where it started.
    // Both remain unhonourable at runtime — that is the defect this migration
    // corrected — but a revert should not leave a shape no migration declared.
    await queryRunner.query(
      `ALTER TABLE bom_changes DROP CONSTRAINT IF EXISTS bom_changes_bom_id_fkey`,
    );
    await queryRunner.query(`
      ALTER TABLE bom_changes
        ADD CONSTRAINT bom_changes_bom_id_fkey
        FOREIGN KEY (bom_id) REFERENCES bom(id) ON DELETE CASCADE
    `);
    await queryRunner.query(
      `ALTER TABLE bom_changes DROP CONSTRAINT IF EXISTS bom_changes_bom_item_id_fkey`,
    );
    await queryRunner.query(`
      ALTER TABLE bom_changes
        ADD CONSTRAINT bom_changes_bom_item_id_fkey
        FOREIGN KEY (bom_item_id) REFERENCES bom_items(id) ON DELETE SET NULL
    `);

    // bom_changes is append-only, so seeded rows cannot be removed here. Drop
    // the table via Task 6's down() if you need a clean slate. The BOMs deleted
    // in up() for having no project do not come back either.
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN source DROP NOT NULL`);
    await queryRunner.query(
      `UPDATE bom_items SET quoted_quantity = NULL, source = NULL, created_by = NULL, updated_by = NULL`,
    );
    await queryRunner.query(`UPDATE bom SET project_id = NULL, baseline_quote_version_id = NULL`);
  }
}
