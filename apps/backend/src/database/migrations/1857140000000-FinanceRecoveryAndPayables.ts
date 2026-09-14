import { MigrationInterface, QueryRunner } from 'typeorm';

import { CREATE_V_PROJECT_COMMISSIONING, DROP_V_PROJECT_COMMISSIONING } from './sql/ledger/13-commissioning.sql';
import {
  CREATE_LEDGER_NORM_CATEGORY,
  CREATE_V_VENDOR_PAYABLE,
  DROP_LEDGER_NORM_CATEGORY,
  DROP_V_VENDOR_PAYABLE,
} from './sql/ledger/14-vendor-payable.sql';
import { CREATE_V_PROJECT_BALANCE_V1, CREATE_V_PROJECT_BALANCE_V2 } from './sql/ledger/15-project-balance-v2.sql';

/**
 * Vendors and credit on the ledger, and the read model Recovery and Payables need.
 *
 * NO ROW IS UPDATED. `trg_ledger_entries_append_only` rejects every UPDATE and
 * DELETE on `ledger_entries`, and that guarantee is not weakened here, not even
 * temporarily. Adding a column with a constant DEFAULT does not rewrite rows in
 * Postgres 11+, so the trigger never fires.
 *
 * Two consequences, both accepted. The dirty legacy categories cannot be
 * rewritten in place and are normalised at read time by `ledger_norm_category`
 * instead. And the old free-text payees cannot be mapped onto vendors — which
 * would match zero rows anyway, since no live payee string shares a name with
 * either vendor.
 *
 * Steps 7 and 8 are database guarantees, not form validation. A credit bill owed
 * to nobody, or money RECEIVED on credit, must be impossible regardless of which
 * caller writes it.
 *
 * `v_project_balance` is rebuilt from `sql/ledger/15-project-balance-v2.sql.ts`,
 * NOT from `06-views.sql.ts` or `12-contract-composition.sql.ts` — see that
 * file's header for why: the database this runs against has already gone
 * through org cleanup, `MilestoneCancelledStatus` and `SplitRefundsOutOfSpend`,
 * and its live `v_project_balance` carries `cancelled_paise` and
 * `refunded_paise` that neither of those two files has.
 */
export class FinanceRecoveryAndPayables1857140000000 implements MigrationInterface {
  name = 'FinanceRecoveryAndPayables1857140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS vendor_id UUID NULL REFERENCES vendors(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS is_cash BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE pending_ledger_entries ADD COLUMN IF NOT EXISTS vendor_id UUID NULL REFERENCES vendors(id)`,
    );

    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type
        CHECK (entry_type IN ('receipt','expense','refund','write_off','vendor_payment'))`);

    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type_direction`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type_direction
        CHECK ((entry_type = 'receipt' AND direction = 'in')
            OR (entry_type IN ('expense','refund','write_off','vendor_payment') AND direction = 'out'))`);

    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT IF EXISTS chk_ple_kind`);
    await queryRunner.query(`
      ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
        CHECK (kind IN ('receipt','expense','reversal','vendor_payment'))`);

    // A credit bill owed to nobody is not a payable, it is a hole.
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_credit_vendor
        CHECK (is_cash OR vendor_id IS NOT NULL)`);
    // Money cannot be RECEIVED on credit. That is a receivable, and it already
    // has a home in payment_milestones.
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_credit_is_out
        CHECK (is_cash OR direction = 'out')`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_vendor
        ON ledger_entries (vendor_id) WHERE vendor_id IS NOT NULL`);

    await queryRunner.query(CREATE_LEDGER_NORM_CATEGORY);
    await queryRunner.query(CREATE_V_PROJECT_COMMISSIONING);
    await queryRunner.query(CREATE_V_VENDOR_PAYABLE);
    // 16 columns -> 17, appending committed_unpaid_paise at the end: a plain
    // CREATE OR REPLACE VIEW is sufficient here because Postgres only forbids
    // REMOVING columns that way, not adding trailing ones (verified against
    // this database; see 15-project-balance-v2.sql.ts's header). down() cannot
    // use the same trick in reverse.
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V2);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Before anything is dropped. See refuseIfCreditDataWouldBeLost.
    await this.refuseIfCreditDataWouldBeLost(queryRunner);

    // v_project_balance first: it is the only object that depends on is_cash.
    //
    // This CANNOT be `CREATE OR REPLACE VIEW` with the V1 body directly on top
    // of V2: V1 has 16 columns, V2 has 17 (committed_unpaid_paise, appended
    // last), and Postgres refuses to drop a view column that way — confirmed
    // against this database with a throwaway view ("cannot drop columns from
    // view"). Explicitly DROP then CREATE instead. Nothing else depends on
    // v_project_balance (checked via pg_depend against the live database), so
    // the DROP cannot cascade into anything unexpected.
    await queryRunner.query(`DROP VIEW IF EXISTS v_project_balance`);
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V1);
    await queryRunner.query(DROP_V_VENDOR_PAYABLE);
    await queryRunner.query(DROP_V_PROJECT_COMMISSIONING);
    await queryRunner.query(DROP_LEDGER_NORM_CATEGORY);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ledger_entries_vendor`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_credit_is_out`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_credit_vendor`);

    // chk_ple_kind CANNOT be narrowed back to 'receipt'/'expense'/'reversal'.
    // pending_ledger_entries has no append-only trigger of its own, so today's
    // 11 'vendor_payment' rows could technically be deleted — but that would
    // only hide the real problem until the next one is created, because a
    // pending vendor payment that gets approved becomes exactly the kind of
    // ledger_entries row described below, which cannot be undone. So this
    // constraint is dropped and put back in the SAME widened form `up()`
    // creates, not the original narrow one.
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT IF EXISTS chk_ple_kind`);
    await queryRunner.query(`
      ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
        CHECK (kind IN ('receipt','expense','reversal','vendor_payment'))`);

    // chk_ledger_entries_type_direction and chk_ledger_entries_type, below,
    // CANNOT be narrowed back either, and for a stricter reason: an approved
    // vendor payment is a PERMANENT fact here. `trg_ledger_entries_append_only`
    // rejects every UPDATE and DELETE on `ledger_entries`, by design, with no
    // exception for a migration. The moment a single 'vendor_payment' row
    // exists — one already does, in this database — re-adding either
    // constraint in its pre-migration form throws "violated by some row" and
    // the revert never completes. Dropping a CHECK is always safe; re-narrowing
    // one that an existing row would fail is not. So both are dropped and put
    // back in the SAME widened form `up()` creates. Accepted consequence: a
    // rolled-back database still has an entry_type value ('vendor_payment')
    // that the pre-migration code has never heard of. That is a permanent
    // limit on this migration's reversibility, not a bug in down() — naming it
    // here is the point.
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type_direction`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type_direction
        CHECK ((entry_type = 'receipt' AND direction = 'in')
            OR (entry_type IN ('expense','refund','write_off','vendor_payment') AND direction = 'out'))`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_entries_type`);
    await queryRunner.query(`
      ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_type
        CHECK (entry_type IN ('receipt','expense','refund','write_off','vendor_payment'))`);

    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP COLUMN IF EXISTS vendor_id`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP COLUMN IF EXISTS is_cash`);
    await queryRunner.query(`ALTER TABLE ledger_entries DROP COLUMN IF EXISTS vendor_id`);
  }

  /**
   * A rollback that would destroy money records refuses to run.
   *
   * `down()` drops `ledger_entries.is_cash`, `ledger_entries.vendor_id` and
   * `pending_ledger_entries.vendor_id`, and dropping a column destroys what it
   * holds. Re-running `up()` does not bring it back: the columns return holding
   * their defaults. So once any row carries something other than a default, a
   * rollback silently records every bill taken on credit as cash already spent,
   * and forgets which vendor each bill and payment belonged to.
   *
   * `ledger_entries` is append-only, so those rows could never be corrected
   * afterwards. This is not hypothetical: a rollback and re-run during review on
   * 2026-09-14 did exactly this to a development database, leaving a credit bill
   * counted as cash and four vendor-payment requests with no vendor.
   *
   * With nothing to lose — every `is_cash` true, every `vendor_id` empty — the
   * rollback proceeds as before.
   *
   * The counts are cast to int: Postgres returns COUNT as bigint, which
   * node-postgres hands over as a string, and adding strings concatenates.
   */
  private async refuseIfCreditDataWouldBeLost(queryRunner: QueryRunner): Promise<void> {
    const [counts] = (await queryRunner.query(`
      SELECT
        (SELECT COUNT(*) FROM ledger_entries WHERE NOT is_cash)::int                   AS "creditBills",
        (SELECT COUNT(*) FROM ledger_entries WHERE vendor_id IS NOT NULL)::int         AS "vendorEntries",
        (SELECT COUNT(*) FROM pending_ledger_entries WHERE vendor_id IS NOT NULL)::int AS "vendorRequests"
    `)) as Array<{ creditBills: number; vendorEntries: number; vendorRequests: number }>;

    // A SELECT with no FROM always yields one row. If it somehow did not, fail
    // closed: nothing here proves the rollback is safe, so it does not run.
    if (!counts) {
      throw new Error(`Cannot roll back ${this.name}: could not confirm no credit data would be lost.`);
    }

    const { creditBills, vendorEntries, vendorRequests } = counts;
    if (creditBills + vendorEntries + vendorRequests === 0) {
      return;
    }

    throw new Error(
      `Cannot roll back ${this.name}: ${creditBills} ledger entries are bills on credit, ` +
        `${vendorEntries} ledger entries name a vendor, and ${vendorRequests} approval requests name a vendor. ` +
        `Rolling back drops the is_cash and vendor_id columns, which would permanently record every credit bill ` +
        `as cash spent and erase which vendor each bill and payment belongs to. ledger_entries is append-only, ` +
        `so those rows could never be corrected. Fix forward with a new migration, or restore a backup taken ` +
        `before this migration ran.`,
    );
  }
}
