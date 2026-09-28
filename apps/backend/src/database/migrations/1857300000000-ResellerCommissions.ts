import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reseller commissions (spec 2026-09-28).
 *
 * - customer_profiles.reseller_id: which reseller brought the customer in.
 * - employee_commissions is keyed by the QUOTE. The project is found through
 *   projects.quote_id, so project_id goes: a copy that nothing keeps in step.
 *   Existing rows are back-filled through their project before it is dropped.
 * - The four stored counters on employee_profiles go. Three were never
 *   written; the fourth drifted. Everything is computed live now.
 * - pending_ledger_entries accepts kind 'commission'.
 *
 * New CHECKs are NOT VALID: they bind every new write without failing on
 * rows written by hand before this existed. Task 17 validates them locally.
 *
 * Forward-only in practice. Never revert this on the shared database.
 */
export class ResellerCommissions1857300000000 implements MigrationInterface {
  name = 'ResellerCommissions1857300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Customer → reseller
    await queryRunner.query(`ALTER TABLE customer_profiles ADD COLUMN reseller_id uuid NULL`);
    await queryRunner.query(
      `ALTER TABLE customer_profiles ADD CONSTRAINT fk_customer_profiles_reseller
         FOREIGN KEY (reseller_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_customer_profiles_reseller ON customer_profiles(reseller_id)
         WHERE deleted_at IS NULL`,
    );

    // 2. Commission → quote, back-filled through the project
    await queryRunner.query(`ALTER TABLE employee_commissions ADD COLUMN quote_id uuid NULL`);
    await queryRunner.query(
      `UPDATE employee_commissions c SET quote_id = p.quote_id
         FROM projects p WHERE p.id = c.project_id AND c.quote_id IS NULL`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM employee_commissions WHERE quote_id IS NULL) THEN
          RAISE EXCEPTION 'employee_commissions has rows with no quote. Fix them by hand first; do not guess a quote.';
        END IF;
        IF EXISTS (SELECT quote_id FROM employee_commissions GROUP BY quote_id HAVING count(*) > 1) THEN
          RAISE EXCEPTION 'Two employee_commissions rows share a quote. Resolve by hand first.';
        END IF;
      END $$;`);
    await queryRunner.query(`ALTER TABLE employee_commissions ALTER COLUMN quote_id SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE employee_commissions ADD CONSTRAINT fk_employee_commissions_quote
         FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_employee_commissions_quote ON employee_commissions(quote_id)`,
    );

    // 3. Reshape
    await queryRunner.query(
      `ALTER TABLE employee_commissions RENAME COLUMN project_value TO base_amount`,
    );
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ADD COLUMN base_source varchar(20) NOT NULL DEFAULT 'manual',
        ADD COLUMN rate_source varchar(20) NOT NULL DEFAULT 'manual',
        ADD COLUMN payout_request_id uuid NULL
          REFERENCES pending_ledger_entries(id) ON DELETE SET NULL,
        ADD COLUMN payout_rejected_reason text NULL,
        ADD COLUMN expense_entry_id uuid NULL
          REFERENCES ledger_entries(id) ON DELETE RESTRICT,
        ADD COLUMN recovered_amount numeric(15,2) NULL,
        ADD COLUMN cancel_reason text NULL`);
    // Rows before this were made by hand, so 'manual' is the true source.
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ALTER COLUMN base_source DROP DEFAULT,
        ALTER COLUMN rate_source DROP DEFAULT`);
    await queryRunner.query(
      `UPDATE employee_commissions SET status = 'pending' WHERE status IS NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE employee_commissions DROP COLUMN project_id`);

    // 4. Checks — NOT VALID, see the class comment
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        ADD CONSTRAINT chk_ec_status CHECK (status IN ('pending','approved','paid','cancelled')) NOT VALID,
        ADD CONSTRAINT chk_ec_rate CHECK (commission_percentage BETWEEN 0 AND 100) NOT VALID,
        ADD CONSTRAINT chk_ec_base CHECK (base_amount >= 0) NOT VALID,
        ADD CONSTRAINT chk_ec_amount CHECK (commission_amount >= 0) NOT VALID,
        ADD CONSTRAINT chk_ec_base_source
          CHECK (base_source IN ('discounted_base','derived','manual','missing')) NOT VALID,
        ADD CONSTRAINT chk_ec_rate_source
          CHECK (rate_source IN ('profile','manual','missing')) NOT VALID,
        ADD CONSTRAINT chk_ec_paid_has_expense
          CHECK (status <> 'paid' OR expense_entry_id IS NOT NULL) NOT VALID,
        ADD CONSTRAINT chk_ec_recovery
          CHECK (recovered_at IS NULL OR (status = 'paid' AND recovered_amount IS NOT NULL
                 AND recovered_amount >= 0 AND recovered_amount <= commission_amount)) NOT VALID`);

    // 5. Commission history must never vanish with a profile
    await queryRunner.query(
      `ALTER TABLE employee_commissions DROP CONSTRAINT IF EXISTS FK_employee_commissions_employee_id`,
    );
    await queryRunner.query(
      `ALTER TABLE employee_commissions DROP CONSTRAINT IF EXISTS "FK_employee_commissions_employee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE employee_commissions ADD CONSTRAINT fk_employee_commissions_employee
         FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT`,
    );

    // 6. The queue accepts commission payouts
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT chk_ple_kind`);
    await queryRunner.query(
      `ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
         CHECK (kind IN ('receipt','expense','reversal','vendor_payment','commission'))`,
    );

    // 7. Dead counters
    await queryRunner.query(`
      ALTER TABLE employee_profiles
        DROP COLUMN IF EXISTS total_leads_generated,
        DROP COLUMN IF EXISTS total_projects_converted,
        DROP COLUMN IF EXISTS total_revenue_generated,
        DROP COLUMN IF EXISTS total_commission_earned`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employee_profiles
        ADD COLUMN total_leads_generated integer,
        ADD COLUMN total_projects_converted integer,
        ADD COLUMN total_revenue_generated numeric(15,2),
        ADD COLUMN total_commission_earned numeric(15,2)`);
    await queryRunner.query(`ALTER TABLE pending_ledger_entries DROP CONSTRAINT chk_ple_kind`);
    await queryRunner.query(
      `ALTER TABLE pending_ledger_entries ADD CONSTRAINT chk_ple_kind
         CHECK (kind IN ('receipt','expense','reversal','vendor_payment'))`,
    );
    await queryRunner.query(`ALTER TABLE employee_commissions ADD COLUMN project_id uuid NULL`);
    await queryRunner.query(
      `UPDATE employee_commissions c SET project_id = p.id FROM projects p WHERE p.quote_id = c.quote_id`,
    );
    await queryRunner.query(`
      ALTER TABLE employee_commissions
        DROP CONSTRAINT chk_ec_status, DROP CONSTRAINT chk_ec_rate, DROP CONSTRAINT chk_ec_base,
        DROP CONSTRAINT chk_ec_amount, DROP CONSTRAINT chk_ec_base_source,
        DROP CONSTRAINT chk_ec_rate_source, DROP CONSTRAINT chk_ec_paid_has_expense,
        DROP CONSTRAINT chk_ec_recovery,
        DROP COLUMN base_source, DROP COLUMN rate_source, DROP COLUMN payout_request_id,
        DROP COLUMN payout_rejected_reason, DROP COLUMN expense_entry_id,
        DROP COLUMN recovered_amount, DROP COLUMN cancel_reason`);
    await queryRunner.query(
      `ALTER TABLE employee_commissions RENAME COLUMN base_amount TO project_value`,
    );
    await queryRunner.query(`DROP INDEX uq_employee_commissions_quote`);
    await queryRunner.query(
      `ALTER TABLE employee_commissions DROP CONSTRAINT fk_employee_commissions_quote, DROP COLUMN quote_id`,
    );
    await queryRunner.query(`DROP INDEX idx_customer_profiles_reseller`);
    await queryRunner.query(
      `ALTER TABLE customer_profiles DROP CONSTRAINT fk_customer_profiles_reseller, DROP COLUMN reseller_id`,
    );
  }
}
