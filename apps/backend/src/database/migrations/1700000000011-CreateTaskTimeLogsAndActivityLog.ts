import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Create Task Time Logs and Activity Log Tables
 * Module: Module 8 - Project Tasks Enhancement
 * Tables: task_time_logs, task_activity_log
 * Purpose: Time tracking and detailed change history for project tasks
 */
export class CreateTaskTimeLogsAndActivityLog1700000000011
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // TABLE: task_time_logs (Time tracking)
    // ============================================
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

    // Create indexes for task_time_logs
    await queryRunner.query(`
      CREATE INDEX idx_task_time_logs_task ON task_time_logs(task_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_time_logs_user ON task_time_logs(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_time_logs_date ON task_time_logs(work_date);
    `);

    // ============================================
    // TABLE: task_activity_log (Detailed change history)
    // ============================================
    await queryRunner.query(`
      CREATE TABLE task_activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL,
        
        -- Activity Type: 'status_changed', 'assigned', 'commented', 'updated'
        activity_type VARCHAR(50) NOT NULL,
        
        -- Changes
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        
        -- Actor
        user_id UUID,
        
        -- Timestamp
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign Keys
        CONSTRAINT fk_task_activity_log_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_activity_log_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Create indexes for task_activity_log
    await queryRunner.query(`
      CREATE INDEX idx_task_activity_log_task ON task_activity_log(task_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_activity_log_created ON task_activity_log(created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_activity_log_type ON task_activity_log(activity_type);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_activity_log CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_time_logs CASCADE;`);
  }
}

