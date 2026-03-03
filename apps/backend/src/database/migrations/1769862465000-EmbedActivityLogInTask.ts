import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Embed Activity Log in Task Entity
 * Purpose: Move activity log from separate table to JSONB field in project_tasks
 *
 * Steps:
 * 1. Add activity_log JSONB column to project_tasks
 * 2. Migrate existing data from task_activity_log table
 * 3. Drop task_activity_log table
 */
export class EmbedActivityLogInTask1769862465000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add activity_log JSONB column to project_tasks
    await queryRunner.query(`
      ALTER TABLE project_tasks 
      ADD COLUMN activity_log JSONB DEFAULT '[]'::jsonb;
    `);

    // Step 2: Migrate existing data from task_activity_log into the new column
    // Aggregate all activity logs per task into a JSONB array
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET activity_log = COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', tal.id::text,
              'activityType', tal.activity_type,
              'userId', tal.user_id::text,
              'fieldName', tal.field_name,
              'oldValue', tal.old_value,
              'newValue', tal.new_value,
              'createdAt', to_char(tal.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            )
            ORDER BY tal.created_at DESC
          )
          FROM task_activity_log tal
          WHERE tal.task_id = pt.id
        ),
        '[]'::jsonb
      );
    `);

    // Step 3: Drop the task_activity_log table
    await queryRunner.query(`DROP TABLE IF EXISTS task_activity_log CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the task_activity_log table
    await queryRunner.query(`
      CREATE TABLE task_activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_task_activity_log_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_activity_log_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Recreate indexes
    await queryRunner.query(
      `CREATE INDEX idx_task_activity_log_task ON task_activity_log(task_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_task_activity_log_created ON task_activity_log(created_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_task_activity_log_type ON task_activity_log(activity_type);`,
    );

    // Migrate data back from JSONB to table
    await queryRunner.query(`
      INSERT INTO task_activity_log (id, task_id, activity_type, field_name, old_value, new_value, user_id, created_at)
      SELECT 
        (entry->>'id')::uuid,
        pt.id,
        entry->>'activityType',
        entry->>'fieldName',
        entry->>'oldValue',
        entry->>'newValue',
        NULLIF(entry->>'userId', '')::uuid,
        (entry->>'createdAt')::timestamptz
      FROM project_tasks pt,
      LATERAL jsonb_array_elements(pt.activity_log) AS entry
      WHERE jsonb_array_length(pt.activity_log) > 0;
    `);

    // Drop the activity_log column
    await queryRunner.query(`
      ALTER TABLE project_tasks 
      DROP COLUMN IF EXISTS activity_log;
    `);
  }
}
