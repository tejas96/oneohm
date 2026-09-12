import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer WhatsApp alerts for completed steps.
 *
 * `workflow_steps.whatsapp_since` is set when an admin ticks "WhatsApp the
 * customer when this step is done" and cleared when they untick it. Only a
 * completion at or after it sends, so ticking a step never messages the
 * customers of work that was finished before.
 *
 * `project_tasks.customer_whatsapp` holds the task's latest attempt, or NULL
 * while it has never been messaged. It lives on the task rather than in its own
 * table so there is nothing extra to join or clean up; a NULL jsonb costs a
 * single bit in the row's null bitmap, and the send job writes only this column,
 * leaving `updated_at` and `version` alone so a message never looks like a task
 * edit.
 *
 * Shape, all keys optional except status and taskCompletedAt:
 *   { status, taskCompletedAt, phone, updateText, reason,
 *     providerMessageId, sentAt, deliveredAt, readAt, updatedAt }
 */
export class AddCustomerWhatsappToTasks1857120000000 implements MigrationInterface {
  name = 'AddCustomerWhatsappToTasks1857120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS whatsapp_since timestamptz NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS customer_update_text varchar(200) NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS customer_whatsapp jsonb NULL`,
    );

    // The WhatsApp webhook finds a task by Meta's message id. Partial, so it
    // covers only tasks that were actually messaged, not all of project_tasks.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_tasks_customer_whatsapp_message
        ON project_tasks ((customer_whatsapp ->> 'providerMessageId'))
        WHERE customer_whatsapp IS NOT NULL
    `);

    // The send job asks for tasks still waiting to be messaged.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_tasks_customer_whatsapp_pending
        ON project_tasks (completed_at)
        WHERE status = 'done' AND deleted_at IS NULL AND completed_at IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_tasks_customer_whatsapp_pending`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_tasks_customer_whatsapp_message`);
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS customer_whatsapp`);
    await queryRunner.query(
      `ALTER TABLE workflow_steps DROP COLUMN IF EXISTS customer_update_text`,
    );
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS whatsapp_since`);
  }
}
