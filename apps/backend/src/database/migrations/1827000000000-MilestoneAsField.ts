import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Milestone-as-Field Migration
 *
 * Moves milestone membership from a separate `project_milestones` table to
 * denormalized columns on `project_tasks`. Backfills existing data before
 * dropping the old structures. This is a one-way migration.
 *
 * Deploy ordering: ship this migration in the same release as the app code
 * that removes all entity/service references to `project_milestones`.
 * Run migrations before the app accepts traffic.
 */
export class MilestoneAsField1827000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Step 1: Add new columns ─────────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD COLUMN IF NOT EXISTS milestone_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS milestone_order INT;
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_steps
        ADD COLUMN IF NOT EXISTS default_milestone_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS default_milestone_order INT;
    `);

    // ── Step 2: Backfill workflow_steps from default_milestone_type ─────────
    // Convert snake_case enum values to Title Case names and assign sensible order.

    await queryRunner.query(`
      UPDATE workflow_steps
      SET
        default_milestone_name = CASE default_milestone_type
          WHEN 'site_survey'            THEN 'Site Survey'
          WHEN 'design'                 THEN 'Design'
          WHEN 'planning'               THEN 'Planning'
          WHEN 'approval'               THEN 'Approval'
          WHEN 'permits'                THEN 'Permits & Approvals'
          WHEN 'material_procurement'   THEN 'Material Procurement'
          WHEN 'electrical'             THEN 'Electrical'
          WHEN 'installation'           THEN 'Installation'
          WHEN 'inspection'             THEN 'Inspection'
          WHEN 'testing'                THEN 'Testing'
          WHEN 'commissioning'          THEN 'Commissioning'
          WHEN 'monitoring'             THEN 'Monitoring'
          WHEN 'handover'               THEN 'Handover'
          WHEN 'custom'                 THEN 'Custom'
          ELSE INITCAP(REPLACE(default_milestone_type, '_', ' '))
        END,
        default_milestone_order = CASE default_milestone_type
          WHEN 'site_survey'            THEN 1
          WHEN 'design'                 THEN 2
          WHEN 'planning'               THEN 2
          WHEN 'approval'               THEN 3
          WHEN 'permits'                THEN 3
          WHEN 'material_procurement'   THEN 4
          WHEN 'electrical'             THEN 5
          WHEN 'installation'           THEN 6
          WHEN 'inspection'             THEN 7
          WHEN 'testing'                THEN 8
          WHEN 'commissioning'          THEN 9
          WHEN 'monitoring'             THEN 10
          WHEN 'handover'               THEN 11
          WHEN 'custom'                 THEN 99
          ELSE 99
        END
      WHERE default_milestone_type IS NOT NULL
        AND default_milestone_name IS NULL;
    `);

    // ── Step 3: Backfill project_tasks from project_milestones ─────────────

    await queryRunner.query(`
      UPDATE project_tasks pt
      SET
        milestone_name  = pm.name,
        milestone_order = pm.sequence_order
      FROM project_milestones pm
      WHERE pt.milestone_id = pm.id
        AND pt.deleted_at IS NULL
        AND pm.deleted_at IS NULL;
    `);

    // ── Step 4: Add covering index for aggregation queries ──────────────────

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_tasks_milestone
        ON project_tasks(project_id, milestone_name)
        WHERE deleted_at IS NULL;
    `);

    // ── Step 5: Drop old milestone_id column from project_tasks ────────────
    // TypeORM had a @ManyToOne with onDelete: 'SET NULL'; the FK constraint
    // must be dropped before the column.

    await queryRunner.query(`
      DO $$
      DECLARE
        fk_name TEXT;
      BEGIN
        SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'project_tasks'
          AND kcu.column_name = 'milestone_id'
          AND tc.constraint_type = 'FOREIGN KEY'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE project_tasks DROP CONSTRAINT %I', fk_name);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks DROP COLUMN IF EXISTS milestone_id;
    `);

    // ── Step 6: Drop the index that referenced milestone_id ────────────────

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_project_tasks_milestone_id_deleted_at";
    `);

    // ── Step 7: Drop project_milestones table ───────────────────────────────

    await queryRunner.query(`DROP TABLE IF EXISTS project_milestones CASCADE;`);

    // ── Step 8: Drop default_milestone_type column from workflow_steps ──────

    await queryRunner.query(`
      ALTER TABLE workflow_steps DROP COLUMN IF EXISTS default_milestone_type;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reverse — data restoration is not guaranteed.
    // Re-add columns but cannot restore the dropped table data.

    await queryRunner.query(`
      ALTER TABLE workflow_steps
        ADD COLUMN IF NOT EXISTS default_milestone_type VARCHAR(50);
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD COLUMN IF NOT EXISTS milestone_id UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP COLUMN IF EXISTS milestone_name,
        DROP COLUMN IF EXISTS milestone_order;
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_steps
        DROP COLUMN IF EXISTS default_milestone_name,
        DROP COLUMN IF EXISTS default_milestone_order;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_project_tasks_milestone;
    `);
  }
}
