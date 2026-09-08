import { MigrationInterface, QueryRunner } from 'typeorm';

export class DealLossAndCancellationColumns1857000000000 implements MigrationInterface {
  name = 'DealLossAndCancellationColumns1857000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS loss_reason varchar(40);
      ALTER TABLE customer_profiles   ADD COLUMN IF NOT EXISTS loss_reason varchar(40);

      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS voided_at  timestamptz;
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS void_reason varchar(500);

      ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancel_reason text;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS loss_reason   varchar(40);
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS settled_at    timestamptz;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS settled_by    uuid;

      ALTER TABLE employee_commissions ADD COLUMN IF NOT EXISTS recovered_at   timestamptz;
      ALTER TABLE employee_commissions ADD COLUMN IF NOT EXISTS recovery_notes text;
    `);

    // The accepted-quote lock reads this on every quote create and status
    // change. Partial index: the vast majority of quotes are never voided.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_property_live
        ON quotes (property_id) WHERE voided_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_quotes_property_live;

      ALTER TABLE employee_commissions DROP COLUMN IF EXISTS recovery_notes;
      ALTER TABLE employee_commissions DROP COLUMN IF EXISTS recovered_at;

      ALTER TABLE projects DROP COLUMN IF EXISTS settled_by;
      ALTER TABLE projects DROP COLUMN IF EXISTS settled_at;
      ALTER TABLE projects DROP COLUMN IF EXISTS cancelled_at;
      ALTER TABLE projects DROP COLUMN IF EXISTS loss_reason;
      ALTER TABLE projects DROP COLUMN IF EXISTS cancel_reason;

      ALTER TABLE quotes DROP COLUMN IF EXISTS void_reason;
      ALTER TABLE quotes DROP COLUMN IF EXISTS voided_at;

      ALTER TABLE customer_profiles   DROP COLUMN IF EXISTS loss_reason;
      ALTER TABLE customer_properties DROP COLUMN IF EXISTS loss_reason;
    `);
  }
}
