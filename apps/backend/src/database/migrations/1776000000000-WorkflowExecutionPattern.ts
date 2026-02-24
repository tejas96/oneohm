import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Workflow Execution Pattern
 *
 * Renames `task_templates` to `workflow_steps`, adds FSM transition columns,
 * makes `project_tasks` lean by introducing override columns, and migrates
 * existing data to the new structure. Preserves checklist progress and
 * user-modified task data in override columns.
 */
export class WorkflowExecutionPattern1776000000000 implements MigrationInterface {
  name = 'WorkflowExecutionPattern1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Rename task_templates → workflow_steps + add FSM column
    await queryRunner.query(`ALTER TABLE task_templates RENAME TO workflow_steps`);
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS allowed_transitions JSONB`,
    );

    // Step 2: Add columns to projects
    await queryRunner.query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS excluded_step_ids UUID[]`,
    );
    await queryRunner.query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_transitions JSONB`,
    );
    await queryRunner.query(`
      UPDATE projects SET default_transitions = '${JSON.stringify({
        backlog: ['todo'],
        todo: ['in_progress', 'backlog'],
        in_progress: ['in_review', 'blocked', 'done', 'testing'],
        in_review: ['done', 'in_progress'],
        testing: ['done', 'in_progress', 'blocked'],
        blocked: ['in_progress', 'cancelled'],
        done: ['in_progress'],
        cancelled: ['backlog'],
      })}'
      WHERE default_transitions IS NULL
    `);

    // Step 3: Alter project_tasks
    await queryRunner.query(
      `ALTER TABLE project_tasks RENAME COLUMN task_template_id TO workflow_step_id`,
    );
    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS name_override VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS description_override TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS checklist_override JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS labels_override TEXT[]`,
    );

    // 3a: Migrate ad-hoc tasks (no template) — copy ALL data to overrides
    await queryRunner.query(`
      UPDATE project_tasks
      SET name_override = name,
          description_override = description,
          checklist_override = checklist,
          labels_override = labels
      WHERE workflow_step_id IS NULL
        AND name IS NOT NULL
    `);

    // 3b: Migrate user-modified NAMES on template tasks
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET name_override = pt.name
      FROM workflow_steps ws
      WHERE ws.id = pt.workflow_step_id
        AND pt.name IS NOT NULL
        AND pt.name != ws.name
    `);

    // 3c: Migrate user-modified DESCRIPTIONS on template tasks
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET description_override = pt.description
      FROM workflow_steps ws
      WHERE ws.id = pt.workflow_step_id
        AND pt.description IS DISTINCT FROM ws.description
    `);

    // 3d: Migrate user-modified CHECKLISTS on template tasks (preserves check progress)
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET checklist_override = pt.checklist
      FROM workflow_steps ws
      WHERE ws.id = pt.workflow_step_id
        AND pt.checklist IS DISTINCT FROM ws.checklist_template
    `);

    // 3e: Migrate user-modified LABELS on template tasks
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET labels_override = pt.labels
      FROM workflow_steps ws
      WHERE ws.id = pt.workflow_step_id
        AND pt.labels IS DISTINCT FROM
            (CASE WHEN ws.type IS NOT NULL THEN ARRAY[ws.type]::text[] ELSE NULL::text[] END)
    `);

    // 3f: Make name column nullable
    await queryRunner.query(
      `ALTER TABLE project_tasks ALTER COLUMN name DROP NOT NULL`,
    );

    // 3g: Null out duplicated data on ALL template tasks
    await queryRunner.query(`
      UPDATE project_tasks
      SET name = NULL, description = NULL, checklist = NULL, labels = NULL
      WHERE workflow_step_id IS NOT NULL
    `);

    // 3h: Rename indexes (IF EXISTS to be safe with auto-generated names)
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "idx_project_tasks_task_template_id_deleted_at"
        RENAME TO "idx_project_tasks_workflow_step_id_deleted_at"
    `);
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_project_tasks_task_template_id_deleted_at"
        RENAME TO "IDX_project_tasks_workflow_step_id_deleted_at"
    `);

    // Step 4: Update FK constraint
    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP CONSTRAINT IF EXISTS "fk_project_tasks_task_template_id"
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP CONSTRAINT IF EXISTS "FK_project_tasks_task_template_id"
    `);
    // Drop any TypeORM auto-generated FK by column name
    const fks = await queryRunner.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
      WHERE con.conrelid = 'project_tasks'::regclass
        AND con.contype = 'f'
        AND att.attname = 'workflow_step_id'
    `);
    for (const fk of fks) {
      await queryRunner.query(
        `ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS "${fk.conname}"`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD CONSTRAINT "FK_project_tasks_workflow_step_id"
        FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id) ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse FK
    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP CONSTRAINT IF EXISTS "FK_project_tasks_workflow_step_id"
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD CONSTRAINT "FK_project_tasks_task_template_id"
        FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id) ON DELETE SET NULL
    `);

    // Restore name data from overrides before making NOT NULL
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET name = COALESCE(pt.name_override, ws.name, 'Unnamed Task'),
          description = COALESCE(pt.description_override, ws.description),
          checklist = COALESCE(pt.checklist_override, ws.checklist_template),
          labels = COALESCE(pt.labels_override, CASE WHEN ws.type IS NOT NULL THEN ARRAY[ws.type] ELSE NULL END)
      FROM workflow_steps ws
      WHERE ws.id = pt.workflow_step_id AND pt.name IS NULL
    `);
    await queryRunner.query(`
      UPDATE project_tasks
      SET name = COALESCE(name_override, 'Unnamed Task')
      WHERE workflow_step_id IS NULL AND name IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE project_tasks ALTER COLUMN name SET NOT NULL`,
    );

    // Drop override columns
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS labels_override`);
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS checklist_override`);
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS description_override`);
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS name_override`);

    // Rename column back
    await queryRunner.query(
      `ALTER TABLE project_tasks RENAME COLUMN workflow_step_id TO task_template_id`,
    );

    // Rename indexes back
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "idx_project_tasks_workflow_step_id_deleted_at"
        RENAME TO "idx_project_tasks_task_template_id_deleted_at"
    `);
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_project_tasks_workflow_step_id_deleted_at"
        RENAME TO "IDX_project_tasks_task_template_id_deleted_at"
    `);

    // Drop project columns
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS default_transitions`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS excluded_step_ids`);

    // Drop workflow_steps column and rename back
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS allowed_transitions`);
    await queryRunner.query(`ALTER TABLE workflow_steps RENAME TO task_templates`);

    // Restore FK name after column rename
    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP CONSTRAINT IF EXISTS "FK_project_tasks_task_template_id"
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD CONSTRAINT "FK_project_tasks_task_template_id"
        FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL
    `);
  }
}
