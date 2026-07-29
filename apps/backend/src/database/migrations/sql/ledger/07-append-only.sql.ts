/**
 * Append-only enforcement for the ledger.
 *
 * This is the guarantee the whole rebuild rests on: money rows are facts, and a
 * fact is never edited. Corrections are new rows. That is what gives clients the
 * audit trail they asked for as a property of the schema rather than a feature
 * someone must remember to invoke.
 *
 * Three implementation details, each of which silently defeats the guarantee if
 * you get it wrong:
 *
 *  1. NOT a Postgres RULE. `CREATE RULE ... DO INSTEAD NOTHING` makes the write
 *     vanish while reporting success — TypeORM would believe the UPDATE landed.
 *     A trigger that RAISEs fails loudly, which is what you want.
 *  2. TRUNCATE bypasses row-level triggers entirely, so it needs its own
 *     statement-level trigger.
 *  3. `ENABLE ALWAYS` — a plain trigger is skipped when
 *     `session_replication_role = 'replica'`, which is exactly the setting a
 *     restore or a replication tool sets.
 *
 * Created LAST, after the backfill (M3–M5), so the initial data load needs no
 * bypass mechanism and no permanent escape hatch from the guarantee ever exists.
 */

export const CREATE_APPEND_ONLY_FUNCTION = `
  CREATE OR REPLACE FUNCTION ledger_forbid_mutation()
  RETURNS trigger AS $$
  BEGIN
    RAISE EXCEPTION
      'ledger is append-only: % on % is not permitted (id=%). Post a reversing entry instead.',
      TG_OP, TG_TABLE_NAME, COALESCE(OLD.id::text, '?')
      USING ERRCODE = '0A000';
  END;
  $$ LANGUAGE plpgsql
`;

export const CREATE_APPEND_ONLY_TRIGGERS: string[] = [
  `CREATE TRIGGER trg_ledger_entries_append_only
     BEFORE UPDATE OR DELETE ON ledger_entries
     FOR EACH ROW EXECUTE FUNCTION ledger_forbid_mutation()`,
  `ALTER TABLE ledger_entries ENABLE ALWAYS TRIGGER trg_ledger_entries_append_only`,

  `CREATE TRIGGER trg_ledger_allocations_append_only
     BEFORE UPDATE OR DELETE ON ledger_allocations
     FOR EACH ROW EXECUTE FUNCTION ledger_forbid_mutation()`,
  `ALTER TABLE ledger_allocations ENABLE ALWAYS TRIGGER trg_ledger_allocations_append_only`,

  // TRUNCATE does not fire row-level triggers — it needs its own.
  `CREATE TRIGGER trg_ledger_entries_no_truncate
     BEFORE TRUNCATE ON ledger_entries
     FOR EACH STATEMENT EXECUTE FUNCTION ledger_forbid_mutation()`,
  `ALTER TABLE ledger_entries ENABLE ALWAYS TRIGGER trg_ledger_entries_no_truncate`,

  `CREATE TRIGGER trg_ledger_allocations_no_truncate
     BEFORE TRUNCATE ON ledger_allocations
     FOR EACH STATEMENT EXECUTE FUNCTION ledger_forbid_mutation()`,
  `ALTER TABLE ledger_allocations ENABLE ALWAYS TRIGGER trg_ledger_allocations_no_truncate`,
];

export const ENABLE_LEDGER_APPEND_ONLY: string[] = [
  CREATE_APPEND_ONLY_FUNCTION,
  ...CREATE_APPEND_ONLY_TRIGGERS,
];

export const DISABLE_LEDGER_APPEND_ONLY: string[] = [
  `DROP TRIGGER IF EXISTS trg_ledger_allocations_no_truncate ON ledger_allocations`,
  `DROP TRIGGER IF EXISTS trg_ledger_entries_no_truncate ON ledger_entries`,
  `DROP TRIGGER IF EXISTS trg_ledger_allocations_append_only ON ledger_allocations`,
  `DROP TRIGGER IF EXISTS trg_ledger_entries_append_only ON ledger_entries`,
  `DROP FUNCTION IF EXISTS ledger_forbid_mutation()`,
];
