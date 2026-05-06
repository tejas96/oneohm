import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddOverrideColumnsToExpenses
 *
 * Plan §2.6 (override audit trail). Two columns kept in a separate
 * migration so they are reversible without touching the main expenses
 * table:
 *
 *   override_used    BOOLEAN  — true when the procurement guard was
 *                                bypassed via the
 *                                `expenses:override-procurement-guard`
 *                                permission
 *   override_reason  VARCHAR  — required reason text captured at the
 *                                point of override; never editable later
 *
 * Constraint enforces that a reason is present whenever the override
 * flag is set, so the audit trail is never blank.
 */
export class AddOverrideColumnsToExpenses1830000000005 implements MigrationInterface {
  name = 'AddOverrideColumnsToExpenses1830000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_expenses
        ADD COLUMN IF NOT EXISTS override_used BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS override_reason VARCHAR(500);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_project_expenses_override_reason'
        ) THEN
          ALTER TABLE project_expenses
            ADD CONSTRAINT chk_project_expenses_override_reason
            CHECK (override_used = FALSE OR override_reason IS NOT NULL);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_project_expenses_override_reason'
        ) THEN
          ALTER TABLE project_expenses DROP CONSTRAINT chk_project_expenses_override_reason;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE project_expenses
        DROP COLUMN IF EXISTS override_reason,
        DROP COLUMN IF EXISTS override_used;
    `);
  }
}
