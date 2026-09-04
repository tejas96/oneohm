import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §6.1 — a quotation owns no BOM.
 *
 * These rows were a second copy of quote_snapshot.calculation, rewritten on
 * every quote save. Task 9 moved the quote page and PDF onto the snapshot, so
 * nothing reads them anymore. After this migration, `bom` holds project rows
 * only.
 *
 * Quote-version BOMs never have stock allocations (only projects reserve
 * stock) or return requests (only a project's stock gets returned), so the
 * ON DELETE RESTRICT / NO ACTION FKs from stock_allocations.bom_id and
 * return_requests.bom_id can't fire here. Both are asserted zero below before
 * anything is deleted.
 *
 * THE COMPLICATION — a verification artefact sits on one of these rows.
 * Task 6 deliberately left a single bom_changes row with
 * reason = 'trigger probe' on BOM-ONEOHM_EPC-2026-0001 (a quote_version BOM)
 * to prove the append-only trigger added by
 * 1856300000000-AddBomChangeLogAndSerials actually rejects writes.
 * 1856500000000-BackfillBomBaseline later re-pointed *both* of bom_changes'
 * foreign keys (bom_id and bom_item_id) to ON DELETE RESTRICT specifically so
 * nothing could ever cascade a change-log row out of existence by accident.
 * Between that RESTRICT and the append-only trigger itself, this one row
 * blocks deleting its BOM twice over — so removing it requires, in this exact
 * order:
 *
 *   1. Assert nothing holds stock or a return against a quote_version BOM.
 *   2. Drop the two append-only triggers on bom_changes.
 *   3. Delete ONLY the 'trigger probe' row (guarded, and proven to be
 *      exactly one row before and zero after).
 *   4. Delete the quote_version BOMs (bom_items cascades from bom;
 *      bom_changes now has no row pointing at either, via bom_id or
 *      bom_item_id, so the RESTRICT FKs don't fire).
 *   5. Recreate both triggers, ENABLE ALWAYS included.
 *   6. Prove the guarantee is actually back: both triggers exist with
 *      tgenabled = 'A', and a real UPDATE and a real DELETE against
 *      bom_changes both get rejected again.
 *
 * This is a ONE-TIME removal of a verification artefact, not a new pattern
 * or a permanent bypass. The trigger window this migration opens exists only
 * for the lifetime of its own transaction: TypeORM's default
 * migrationsTransactionMode is "all", so this whole file runs inside one
 * transaction, and if anything below throws, the dropped triggers, the
 * deleted row, and the deleted BOMs all roll back together. There is no path
 * through this migration that commits with the triggers left down.
 *
 * This mirrors sql/ledger/07-append-only.sql.ts, which created its triggers
 * LAST, after its own backfill, "so the initial data load needs no bypass
 * mechanism and no permanent escape hatch from the guarantee ever exists."
 * Same guarantee here: by the time this migration commits, the escape hatch
 * is closed again, and step 6 below proves it rather than assumes it.
 */
export class DeleteQuoteVersionBoms1856700000000 implements MigrationInterface {
  name = 'DeleteQuoteVersionBoms1856700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. Preconditions: nothing references a quote_version BOM ----
    const allocations = (await queryRunner.query(`
      SELECT COUNT(*)::int AS n
        FROM stock_allocations sa
        JOIN bom b ON b.id = sa.bom_id
       WHERE b.entity_type = 'quote_version'
    `)) as Array<{ n: number }>;
    if ((allocations[0]?.n ?? 0) > 0) {
      throw new Error(
        `Cannot delete quote-version BOMs: ${allocations[0]?.n} stock allocation(s) ` +
          `reference them. Investigate — only project BOMs should ever hold allocations.`,
      );
    }

    // return_requests.bom_id is a bare (NO ACTION) FK to bom, not asserted by
    // the brief but found by tracing every FK into `bom` before touching it —
    // same reasoning: only a project BOM should ever be returned against.
    const returns = (await queryRunner.query(`
      SELECT COUNT(*)::int AS n
        FROM return_requests rr
        JOIN bom b ON b.id = rr.bom_id
       WHERE b.entity_type = 'quote_version'
    `)) as Array<{ n: number }>;
    if ((returns[0]?.n ?? 0) > 0) {
      throw new Error(
        `Cannot delete quote-version BOMs: ${returns[0]?.n} return request(s) reference ` +
          `them. Investigate before proceeding.`,
      );
    }

    // ---- 2. Drop the two append-only triggers on bom_changes ----
    // Both UPDATE/DELETE and TRUNCATE are blocked today; step 3 needs to
    // DELETE one row, and the trigger does not care that this migration is
    // the one deleting it.
    await queryRunner.query(`DROP TRIGGER trg_bom_changes_append_only ON bom_changes`);
    await queryRunner.query(`DROP TRIGGER trg_bom_changes_no_truncate ON bom_changes`);

    // ---- 3. Delete the trigger-probe row IF ONE EXISTS ----
    //
    // AT MOST one, never exactly one. The probe was written BY HAND during
    // development to prove the append-only trigger rejects a DELETE — no
    // migration creates it. So it exists only on a database that went through
    // that session, and on every other one — a fresh clone, staging,
    // production, CI, a teammate's laptop — the count is legitimately 0.
    //
    // Requiring exactly 1 made this migration refuse to run anywhere it had
    // not already been run by hand. That is the opposite of what a migration
    // is for. Found by running this batch against a second, untouched
    // database; every review passed because they all only ever saw the first.
    //
    // More than one is still an error: the probe is a single known row, and
    // several would mean something else is writing that reason string.
    const probeBefore = (await queryRunner.query(
      `SELECT COUNT(*)::int AS n FROM bom_changes WHERE reason = 'trigger probe'`,
    )) as Array<{ n: number }>;
    const probeCount = probeBefore[0]?.n ?? 0;

    if (probeCount > 1) {
      throw new Error(
        `Found ${probeCount} 'trigger probe' rows in bom_changes; expected at most 1. ` +
          `Aborting rather than guessing what to delete.`,
      );
    }

    if (probeCount === 1) {
      await queryRunner.query(`DELETE FROM bom_changes WHERE reason = 'trigger probe'`);
      const probeAfter = (await queryRunner.query(
        `SELECT COUNT(*)::int AS n FROM bom_changes WHERE reason = 'trigger probe'`,
      )) as Array<{ n: number }>;
      if ((probeAfter[0]?.n ?? 0) !== 0) {
        throw new Error(`'trigger probe' row survived its own DELETE — aborting.`);
      }
      console.warn(`[migration] Removed the hand-written 'trigger probe' row.`);
    } else {
      console.warn(`[migration] No 'trigger probe' row present — nothing to clean up.`);
    }

    // ---- 4. Delete the quote_version BOMs (bom_items cascades) ----
    const before = (await queryRunner.query(
      `SELECT COUNT(*)::int AS n FROM bom WHERE entity_type = 'quote_version'`,
    )) as Array<{ n: number }>;
    await queryRunner.query(`DELETE FROM bom WHERE entity_type = 'quote_version'`);
    console.warn(`[migration] Deleted ${before[0]?.n ?? 0} quote-version BOM(s).`);

    // ---- 5. Recreate both triggers, ENABLE ALWAYS included ----
    // Verbatim from 1856300000000-AddBomChangeLogAndSerials — this restores
    // the same guarantee, it does not define a new one. ENABLE ALWAYS matters:
    // a plain trigger is skipped when session_replication_role = 'replica',
    // which is exactly what a restore or a replication tool sets.
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

    // ---- 6. Prove the guarantee is back, don't just assume it ----
    await this.assertTriggersEnabled(queryRunner);
    await this.assertMutationRejected(
      queryRunner,
      'verify_update_rejected',
      `UPDATE bom_changes SET reason = reason
        WHERE id = (SELECT id FROM bom_changes ORDER BY id LIMIT 1)`,
    );
    await this.assertMutationRejected(
      queryRunner,
      'verify_delete_rejected',
      `DELETE FROM bom_changes
        WHERE id = (SELECT id FROM bom_changes ORDER BY id LIMIT 1)`,
    );
  }

  public async down(): Promise<void> {
    // Not reconstructible, and not needed: bomLinesFromCalculation regenerates
    // the same lines from the snapshot on demand. Nothing to reverse on the
    // trigger side either — up() never commits with the guarantee down; by
    // the time it returns, both triggers are already back with ENABLE ALWAYS.
  }

  /**
   * tgenabled must be 'A' (ENABLE ALWAYS) for both triggers, not merely
   * present — a plain re-created trigger would report as 'O' and would be
   * silently skipped by session_replication_role = 'replica'.
   */
  private async assertTriggersEnabled(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT tgname, tgenabled
        FROM pg_trigger
       WHERE tgrelid = 'bom_changes'::regclass AND NOT tgisinternal
    `)) as Array<{ tgname: string; tgenabled: string }>;

    for (const triggerName of ['trg_bom_changes_append_only', 'trg_bom_changes_no_truncate']) {
      const row = rows.find((r) => r.tgname === triggerName);
      if (!row) {
        throw new Error(`Trigger ${triggerName} did not come back — aborting.`);
      }
      if (row.tgenabled !== 'A') {
        throw new Error(
          `Trigger ${triggerName} came back but is not ENABLE ALWAYS ` +
            `(tgenabled='${row.tgenabled}'). That is exactly the gap this migration ` +
            `must not reopen.`,
        );
      }
    }
  }

  /**
   * Runs `sql` inside a SAVEPOINT and requires Postgres to reject it with the
   * bom_changes append-only error. The SAVEPOINT is always rolled back
   * afterwards regardless of outcome — this probe never leaves a trace — but
   * if `sql` succeeds, or fails for an unrelated reason, the migration itself
   * fails loudly instead of reporting a false pass.
   */
  private async assertMutationRejected(
    queryRunner: QueryRunner,
    savepoint: string,
    sql: string,
  ): Promise<void> {
    const guard = (await queryRunner.query(`SELECT COUNT(*)::int AS n FROM bom_changes`)) as Array<{
      n: number;
    }>;
    if ((guard[0]?.n ?? 0) === 0) {
      throw new Error('bom_changes is empty — cannot verify the trigger rejects a mutation.');
    }

    await queryRunner.query(`SAVEPOINT ${savepoint}`);
    let rejection: { message?: string; code?: string } | undefined;
    try {
      await queryRunner.query(sql);
    } catch (error) {
      rejection = error as { message?: string; code?: string };
    }
    await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await queryRunner.query(`RELEASE SAVEPOINT ${savepoint}`);

    if (!rejection) {
      throw new Error(
        `Expected the append-only trigger to reject "${sql}", but it succeeded. ` +
          `The guarantee is not actually back — aborting rather than committing a false pass.`,
      );
    }
    const message = rejection.message ?? '';
    if (rejection.code !== '0A000' && !message.includes('is append-only')) {
      throw new Error(
        `"${sql}" was rejected, but not by the append-only guard (${message}). ` +
          `Aborting — this needs investigation, not a silent pass.`,
      );
    }
  }
}
