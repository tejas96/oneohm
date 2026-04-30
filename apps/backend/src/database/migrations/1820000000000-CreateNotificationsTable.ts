import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: CreateNotificationsTable
 *
 * Creates the notifications table for all application events.
 * type and severity stored as VARCHAR + CHECK — zero Postgres ENUMs.
 * Unique partial index on (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
 * ensures at-most-one notification per dedupe_key per user.
 */
export class CreateNotificationsTable1820000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,

        type VARCHAR(50) NOT NULL DEFAULT 'system'
          CHECK (type IN ('low_stock', 'po_approved', 'po_received', 'allocation_cancelled', 'dispatch_delayed', 'system')),

        title VARCHAR(255) NOT NULL,
        body TEXT,

        severity VARCHAR(20) NOT NULL DEFAULT 'info'
          CHECK (severity IN ('info', 'warning', 'critical')),

        link VARCHAR(500),
        metadata JSONB,
        dedupe_key VARCHAR(255),

        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_org ON notifications(organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC)
    `);

    // Unique partial index: at most one notification per user per dedupe_key
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_notifications_user_dedupe
      ON notifications(user_id, dedupe_key)
      WHERE dedupe_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
  }
}
