import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Routine maintenance checkups live on service_tickets.
 *
 * `kind` tells a raised issue from a checkup the hourly job made. Every
 * existing row becomes `issue`. `visit_number` (1–20) is set exactly when the
 * ticket is a checkup, and the unique partial index makes it impossible to
 * create the same visit twice, even with two instances running the job.
 *
 * `customer_whatsapp` holds `{ opened?, closed? }`, one send record per event,
 * the same shape as `project_tasks.customer_whatsapp`.
 */
export class AddRoutineMaintenanceToServiceTickets1857180000000 implements MigrationInterface {
  name = 'AddRoutineMaintenanceToServiceTickets1857180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS kind varchar(20) NOT NULL DEFAULT 'issue'`,
    );
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_number smallint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS checklist jsonb NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS customer_whatsapp jsonb NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE service_tickets
        ADD CONSTRAINT chk_service_tickets_kind CHECK (kind IN ('issue', 'maintenance'))
    `);
    await queryRunner.query(`
      ALTER TABLE service_tickets
        ADD CONSTRAINT chk_service_tickets_visit_number CHECK (
          (kind = 'maintenance') = (visit_number IS NOT NULL)
          AND (visit_number IS NULL OR visit_number BETWEEN 1 AND 20)
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_service_tickets_maintenance_visit
        ON service_tickets (project_id, visit_number)
        WHERE kind = 'maintenance'
    `);

    // The WhatsApp webhook finds a ticket by Meta's message id, per event.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_tickets_whatsapp_opened_message
        ON service_tickets ((customer_whatsapp -> 'opened' ->> 'providerMessageId'))
        WHERE customer_whatsapp IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_service_tickets_whatsapp_closed_message
        ON service_tickets ((customer_whatsapp -> 'closed' ->> 'providerMessageId'))
        WHERE customer_whatsapp IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_tickets_whatsapp_closed_message`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_tickets_whatsapp_opened_message`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_service_tickets_maintenance_visit`);
    await queryRunner.query(
      `ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS chk_service_tickets_visit_number`,
    );
    await queryRunner.query(
      `ALTER TABLE service_tickets DROP CONSTRAINT IF EXISTS chk_service_tickets_kind`,
    );
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS customer_whatsapp`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS checklist`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS visit_number`);
    await queryRunner.query(`ALTER TABLE service_tickets DROP COLUMN IF EXISTS kind`);
  }
}
