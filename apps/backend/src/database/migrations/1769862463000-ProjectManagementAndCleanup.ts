import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Project Management and Entity Cleanup
 *
 * This comprehensive migration:
 * 1. Drops old indexes that reference columns being removed
 * 2. Creates new project_team_members table
 * 3. Initializes kanban_order from sequence_order (before dropping)
 * 4. Adds version column for optimistic locking
 * 5. Simplifies date columns (planned/actual → single start/end)
 * 6. Drops unused columns from project_tasks
 * 7. Updates TaskStatus enum values (pending→backlog, completed→done, adds testing)
 * 8. Simplifies milestone dates, adds audit fields
 * 9. Drops notes from projects, materials; adds audit to materials, surveys
 * 10. Drops milestone_template_id from task_templates
 * 11. Drops milestone_templates table with cleanup
 * 12. Creates new indexes for kanban and team queries
 */
export class ProjectManagementAndCleanup1769862463000 implements MigrationInterface {
  name = 'ProjectManagementAndCleanup1769862463000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =============================================
    // STEP 1: DROP OLD INDEXES FIRST (before changing columns)
    // =============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_tasks_dates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_tasks_plannedStartDate_plannedEndDate_deletedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_task_templates_milestone_template"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_templates_milestoneTemplateId_deletedAt"`);

    // =============================================
    // STEP 2: CREATE NEW TEAM TABLE
    // =============================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_team_members" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "role_name" VARCHAR(100) NOT NULL,
        "is_project_manager" BOOLEAN DEFAULT FALSE,
        "joined_at" TIMESTAMPTZ DEFAULT NOW(),
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "FK_project_team_members_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_team_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_project_team_member" UNIQUE ("project_id", "user_id")
      )
    `);

    // =============================================
    // STEP 3: PROJECT_TASKS - Initialize kanbanOrder from sequenceOrder BEFORE dropping
    // =============================================
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "kanban_order" INTEGER`);
    await queryRunner.query(`UPDATE "project_tasks" SET kanban_order = COALESCE(sequence_order, 1000) WHERE kanban_order IS NULL`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "kanban_order" SET DEFAULT 1000`);

    // Add version column for optimistic locking
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1 NOT NULL`);

    // =============================================
    // STEP 4: PROJECT_TASKS - Simplify date columns
    // =============================================
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "end_date" DATE`);
    await queryRunner.query(`
      UPDATE "project_tasks" SET 
        start_date = COALESCE(actual_start_date, planned_start_date),
        end_date = COALESCE(actual_end_date, planned_end_date)
      WHERE start_date IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "planned_start_date"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "planned_end_date"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "actual_start_date"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "actual_end_date"`);

    // =============================================
    // STEP 5: PROJECT_TASKS - Drop unused columns
    // =============================================
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "story_points"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "estimated_hours"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "type"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "can_run_parallel"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "assigned_to_department"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "sequence_order"`);

    // =============================================
    // STEP 6: PROJECT_TASKS - Update status (data first, then constraint)
    // =============================================
    await queryRunner.query(`UPDATE "project_tasks" SET status = 'backlog' WHERE status = 'pending'`);
    await queryRunner.query(`UPDATE "project_tasks" SET status = 'done' WHERE status = 'completed'`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP CONSTRAINT IF EXISTS "project_tasks_status_check"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP CONSTRAINT IF EXISTS "CHK_project_tasks_status"`);
    // Drop the default FIRST, then change type, then re-add default
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" TYPE VARCHAR(50)`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_tasks_status_enum"`);
    await queryRunner.query(`CREATE TYPE "project_tasks_status_enum" AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'testing', 'blocked', 'done', 'cancelled')`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" TYPE "project_tasks_status_enum" USING status::"project_tasks_status_enum"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" SET DEFAULT 'backlog'`);

    // =============================================
    // STEP 7: PROJECT_MILESTONES - Simplify dates, add audit fields
    // =============================================
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "end_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "created_by" UUID`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "updated_by" UUID`);
    await queryRunner.query(`
      UPDATE "project_milestones" SET 
        start_date = COALESCE(actual_start_date, planned_start_date),
        end_date = COALESCE(actual_end_date, planned_end_date)
      WHERE start_date IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "planned_start_date"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "planned_end_date"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "actual_start_date"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "actual_end_date"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "notes"`);

    // =============================================
    // STEP 8: OTHER ENTITY CHANGES
    // =============================================
    // Projects - drop notes
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "notes"`);

    // Materials - drop notes, add audit
    await queryRunner.query(`ALTER TABLE "project_materials" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "project_materials" ADD COLUMN IF NOT EXISTS "created_by" UUID`);
    await queryRunner.query(`ALTER TABLE "project_materials" ADD COLUMN IF NOT EXISTS "updated_by" UUID`);

    // Surveys - add audit
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN IF NOT EXISTS "created_by" UUID`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN IF NOT EXISTS "updated_by" UUID`);

    // Task templates - drop milestone_template_id
    await queryRunner.query(`ALTER TABLE "task_templates" DROP COLUMN IF EXISTS "milestone_template_id"`);

    // =============================================
    // STEP 9: DROP MILESTONE_TEMPLATES (with trigger cleanup)
    // =============================================
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trigger_update_milestone_templates_updated_at" ON "milestone_templates"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "update_milestone_templates_updated_at"()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestone_templates" CASCADE`);

    // =============================================
    // STEP 10: CREATE NEW INDEXES
    // =============================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_tasks_kanban" ON "project_tasks"("project_id", "status", "kanban_order") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_tasks_dates" ON "project_tasks"("start_date", "end_date") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_team_members_project" ON "project_team_members"("project_id") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_team_members_user" ON "project_team_members"("user_id") 
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // =============================================
    // STEP 1: DROP NEW INDEXES
    // =============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_team_members_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_team_members_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_tasks_dates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_tasks_kanban"`);

    // =============================================
    // STEP 2: RECREATE MILESTONE_TEMPLATES TABLE
    // =============================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "milestone_templates" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "type" VARCHAR(50) NOT NULL,
        "requires_payment" BOOLEAN DEFAULT FALSE,
        "default_payment_percentage" DECIMAL(5,2),
        "sequence_order" INTEGER NOT NULL,
        "is_mandatory" BOOLEAN DEFAULT TRUE,
        "can_skip" BOOLEAN DEFAULT FALSE,
        "depends_on_milestone_codes" TEXT[],
        "estimated_duration_days" INTEGER,
        "is_active" BOOLEAN DEFAULT TRUE,
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // =============================================
    // STEP 3: RE-ADD TASK_TEMPLATES COLUMN
    // =============================================
    await queryRunner.query(`ALTER TABLE "task_templates" ADD COLUMN IF NOT EXISTS "milestone_template_id" UUID`);

    // =============================================
    // STEP 4: RE-ADD AUDIT COLUMNS TO SURVEYS/MATERIALS (and drop them)
    // =============================================
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN IF EXISTS "updated_by"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "project_materials" DROP COLUMN IF EXISTS "updated_by"`);
    await queryRunner.query(`ALTER TABLE "project_materials" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "project_materials" ADD COLUMN IF NOT EXISTS "notes" TEXT`);

    // =============================================
    // STEP 5: RE-ADD NOTES TO PROJECTS
    // =============================================
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "notes" TEXT`);

    // =============================================
    // STEP 6: RESTORE MILESTONE DATE COLUMNS
    // =============================================
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "notes" TEXT`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "planned_start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "planned_end_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "actual_start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_milestones" ADD COLUMN IF NOT EXISTS "actual_end_date" DATE`);
    await queryRunner.query(`
      UPDATE "project_milestones" SET 
        planned_start_date = start_date,
        planned_end_date = end_date
      WHERE planned_start_date IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "updated_by"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "created_by"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "end_date"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "start_date"`);

    // =============================================
    // STEP 7: RESTORE TASK STATUS ENUM
    // =============================================
    await queryRunner.query(`UPDATE "project_tasks" SET status = 'pending' WHERE status = 'backlog'`);
    await queryRunner.query(`UPDATE "project_tasks" SET status = 'completed' WHERE status = 'done'`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" TYPE VARCHAR(50)`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_tasks_status_enum"`);
    await queryRunner.query(`CREATE TYPE "project_tasks_status_enum" AS ENUM ('pending', 'todo', 'in_progress', 'in_review', 'blocked', 'completed', 'cancelled')`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" TYPE "project_tasks_status_enum" USING status::"project_tasks_status_enum"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'`);

    // =============================================
    // STEP 8: RESTORE TASK COLUMNS
    // =============================================
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "sequence_order" INTEGER`);
    await queryRunner.query(`UPDATE "project_tasks" SET sequence_order = kanban_order`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "assigned_to_department" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "can_run_parallel" BOOLEAN DEFAULT FALSE`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "type" VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "notes" TEXT`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "estimated_hours" DECIMAL(10,2)`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "story_points" INTEGER`);

    // Restore task date columns
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "planned_start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "planned_end_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "actual_start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "project_tasks" ADD COLUMN IF NOT EXISTS "actual_end_date" DATE`);
    await queryRunner.query(`
      UPDATE "project_tasks" SET 
        planned_start_date = start_date,
        planned_end_date = end_date
      WHERE planned_start_date IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "end_date"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "start_date"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "project_tasks" DROP COLUMN IF EXISTS "kanban_order"`);

    // =============================================
    // STEP 9: DROP TEAM TABLE
    // =============================================
    await queryRunner.query(`DROP TABLE IF EXISTS "project_team_members"`);

    // =============================================
    // STEP 10: RECREATE OLD INDEXES
    // =============================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_tasks_dates" ON "project_tasks"("planned_start_date", "planned_end_date") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_task_templates_milestone_template" ON "task_templates"("milestone_template_id") 
      WHERE deleted_at IS NULL
    `);
  }
}
