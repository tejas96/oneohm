import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Create Project Tasks Tables
 * Module: Module 8 Enhancement - Project Tasks & Milestones
 * Tables: task_templates, project_tasks
 * Purpose: Jira-style task management within project milestones
 */
export class CreateProjectTasksTables1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // TABLE: task_templates
    // ============================================
    await queryRunner.query(`
      CREATE TABLE task_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        milestone_template_id UUID,
        
        -- Template Info
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Task Configuration
        type VARCHAR(50),
        default_department VARCHAR(100),
        default_role_code VARCHAR(50),
        sequence_order INTEGER NOT NULL,
        
        -- Behavior
        is_mandatory BOOLEAN DEFAULT TRUE,
        can_run_parallel BOOLEAN DEFAULT FALSE,
        depends_on_task_codes TEXT[],
        
        -- Estimation
        estimated_duration_hours INTEGER,
        
        -- Checklist Template
        checklist_template JSONB,
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        -- Constraints
        CONSTRAINT uq_task_templates_org_code UNIQUE (organization_id, code, deleted_at)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_templates_organization ON task_templates(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_templates_milestone_template ON task_templates(milestone_template_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_templates_is_active ON task_templates(is_active) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // TABLE: project_tasks
    // ============================================
    await queryRunner.query(`
      CREATE TABLE project_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        milestone_id UUID,
        task_template_id UUID,
        
        -- Task Info
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Type & Assignment
        type VARCHAR(50),
        assigned_to_user_id UUID,
        assigned_to_department VARCHAR(100),
        
        -- Ordering
        sequence_order INTEGER NOT NULL,
        
        -- Dates
        planned_start_date DATE,
        planned_end_date DATE,
        actual_start_date DATE,
        actual_end_date DATE,
        
        -- Status & Priority
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
          'pending', 'todo', 'in_progress', 'in_review', 'blocked', 'completed', 'cancelled'
        )),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        
        -- Dependencies & Parallelism
        depends_on_task_ids UUID[],
        can_run_parallel BOOLEAN DEFAULT FALSE,
        
        -- Progress
        completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
        
        -- Checklist & Attachments
        checklist JSONB,
        attachments JSONB,
        
        -- Notes
        notes TEXT,
        
        -- Jira-style Fields
        story_points INTEGER CHECK (story_points >= 0),
        labels TEXT[],
        estimated_hours DECIMAL(10,2) CHECK (estimated_hours >= 0),
        logged_hours DECIMAL(10,2) DEFAULT 0 CHECK (logged_hours >= 0),
        watcher_user_ids UUID[],
        blocked_reason TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        -- Constraints
        CONSTRAINT uq_project_tasks_project_code UNIQUE (project_id, code, deleted_at),
        CONSTRAINT fk_project_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_project_tasks_milestone FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE SET NULL,
        CONSTRAINT fk_project_tasks_template FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_project ON project_tasks(project_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_milestone ON project_tasks(milestone_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_assigned_to ON project_tasks(assigned_to_user_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_status ON project_tasks(status) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_priority ON project_tasks(priority) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_template ON project_tasks(task_template_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_project_tasks_dates ON project_tasks(planned_start_date, planned_end_date) WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS project_tasks CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_templates CASCADE;`);
  }
}
