import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer WhatsApp alerts for completed steps.
 *
 * `workflow_steps.whatsapp_since` is set when an admin ticks "WhatsApp the
 * customer when this step is done" and cleared when they untick it. Only a
 * completion at or after it sends, so ticking a step never messages the
 * customers of work that was finished before.
 *
 * `task_whatsapp_messages` holds one row per task: its latest attempt. A task
 * has no row while it waits out the 10 minutes after being done; the send job
 * claims the task by inserting the row as `sending`, and the WhatsApp webhook
 * moves it to delivered, read or failed.
 */
export class AddTaskWhatsappMessages1857120000000 implements MigrationInterface {
  name = 'AddTaskWhatsappMessages1857120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS whatsapp_since timestamptz NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS customer_update_text varchar(200) NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_whatsapp_messages (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_task_id     uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
        project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_completed_at   timestamptz NOT NULL,
        phone               varchar(20) NULL,
        update_text         varchar(200) NULL,
        status              varchar(20) NOT NULL,
        reason              text NULL,
        provider_message_id varchar(255) NULL,
        sent_at             timestamptz NULL,
        delivered_at        timestamptz NULL,
        read_at             timestamptz NULL,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_task_whatsapp_messages_task UNIQUE (project_task_id),
        CONSTRAINT chk_task_whatsapp_messages_status
          CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed', 'skipped'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_whatsapp_messages_provider_id
        ON task_whatsapp_messages (provider_message_id)
        WHERE provider_message_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_whatsapp_messages`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS customer_update_text`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS whatsapp_since`);
  }
}
