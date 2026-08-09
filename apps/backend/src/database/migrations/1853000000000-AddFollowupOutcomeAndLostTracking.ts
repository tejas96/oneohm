import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddFollowupOutcomeAndLostTracking — makes a followup the heartbeat of a lead.
 *
 * Completing a followup now records what happened (`outcome`, `completed_at`)
 * and a lead can be explicitly closed as lost with a reason, at property level
 * or — for an enquiry that never got a site — at customer level.
 *
 * Purely additive and nullable, so existing rows are untouched and nothing
 * changes behaviour until the new complete flow ships. The `lost` status values
 * need no DDL: status columns are varchar, not Postgres enums.
 */
export class AddFollowupOutcomeAndLostTracking1853000000000 implements MigrationInterface {
  name = 'AddFollowupOutcomeAndLostTracking1853000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE followups
        ADD COLUMN IF NOT EXISTS outcome VARCHAR(30),
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties
        ADD COLUMN IF NOT EXISTS lost_reason TEXT,
        ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles
        ADD COLUMN IF NOT EXISTS lost_reason TEXT,
        ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ
    `);

    // Backfill completed_at for rows already completed, so "done today" counts
    // and any future reporting are not silently missing history. updated_at is
    // the closest available proxy for when the completion happened.
    await queryRunner.query(`
      UPDATE followups
         SET completed_at = updated_at
       WHERE status = 'completed'
         AND completed_at IS NULL
    `);

    // The gaps query is a NOT EXISTS over pending followups per lead unit.
    // Without these it degrades to a sequential scan of the whole table.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_followups_property_status
        ON followups (property_id, status)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_followups_customer_status
        ON followups (customer_id, status)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_properties_status
        ON customer_properties (status)
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_customer_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_property_status`);
    await queryRunner.query(`
      ALTER TABLE customer_profiles
        DROP COLUMN IF EXISTS lost_at,
        DROP COLUMN IF EXISTS lost_reason
    `);
    await queryRunner.query(`
      ALTER TABLE customer_properties
        DROP COLUMN IF EXISTS lost_at,
        DROP COLUMN IF EXISTS lost_reason
    `);
    await queryRunner.query(`
      ALTER TABLE followups
        DROP COLUMN IF EXISTS completed_at,
        DROP COLUMN IF EXISTS outcome
    `);
  }
}
