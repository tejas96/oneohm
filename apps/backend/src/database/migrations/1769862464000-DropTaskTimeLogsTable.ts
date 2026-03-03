import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Drop Task Time Logs Table and logged_hours Column
 * Purpose: Remove time tracking functionality - consolidating to TaskActivityLog only
 *
 * Drops:
 * - task_time_logs table (and its indexes)
 * - logged_hours column from project_tasks table
 */
export class DropTaskTimeLogsTable1769862464000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the task_time_logs table (indexes are dropped automatically)
    await queryRunner.query(`DROP TABLE IF EXISTS task_time_logs CASCADE;`);

    // Drop the logged_hours column from project_tasks
    await queryRunner.query(`
      ALTER TABLE project_tasks 
      DROP COLUMN IF EXISTS logged_hours;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate logged_hours column on project_tasks
    await queryRunner.query(`
      ALTER TABLE project_tasks 
      ADD COLUMN logged_hours DECIMAL(10,2) DEFAULT 0 CHECK (logged_hours >= 0);
    `);

    // Recreate task_time_logs table
    await queryRunner.query(`
      CREATE TABLE task_time_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL,
        user_id UUID NOT NULL,
        
        -- Time Tracking
        time_spent_hours DECIMAL(10,2) NOT NULL,
        work_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Description
        work_description TEXT,
        
        -- Billing
        is_billable BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        
        -- Foreign Keys
        CONSTRAINT fk_task_time_logs_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_time_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Recreate indexes
    await queryRunner.query(`CREATE INDEX idx_task_time_logs_task ON task_time_logs(task_id);`);
    await queryRunner.query(`CREATE INDEX idx_task_time_logs_user ON task_time_logs(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_task_time_logs_date ON task_time_logs(work_date);`);
  }
}
