import type { MigrationInterface, QueryRunner } from 'typeorm';

import { CREATE_V_MILESTONE_COMPLETION_V2 } from './sql/org-cleanup/04-views.sql';

/**
 * Restricts project task status to backlog | in_progress | blocked | done.
 * Any task with a legacy status (todo, in_review, testing, cancelled, etc.)
 * is converted to backlog before the enum is narrowed.
 *
 * down() restores the wider enum but cannot recover original per-task statuses
 * rewritten by up() — treat rollback as schema-only.
 */
export class RestrictTaskStatusesToFour1855400000000 implements MigrationInterface {
  name = 'RestrictTaskStatusesToFour1855400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE project_tasks
      SET status = 'backlog'
      WHERE status NOT IN ('backlog', 'in_progress', 'blocked', 'done')
    `);

    await queryRunner.query(`DROP VIEW IF EXISTS v_milestone_completion`);

    await queryRunner.query(`
      ALTER TYPE project_tasks_status_enum RENAME TO project_tasks_status_enum_old
    `);

    await queryRunner.query(`
      CREATE TYPE project_tasks_status_enum AS ENUM (
        'backlog',
        'in_progress',
        'blocked',
        'done'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN status DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN status TYPE project_tasks_status_enum
      USING status::text::project_tasks_status_enum
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN status SET DEFAULT 'backlog'
    `);

    await queryRunner.query(`DROP TYPE project_tasks_status_enum_old`);

    await queryRunner.query(CREATE_V_MILESTONE_COMPLETION_V2);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_milestone_completion`);

    await queryRunner.query(`
      ALTER TYPE project_tasks_status_enum RENAME TO project_tasks_status_enum_old
    `);

    await queryRunner.query(`
      CREATE TYPE project_tasks_status_enum AS ENUM (
        'backlog',
        'todo',
        'in_progress',
        'in_review',
        'testing',
        'blocked',
        'done',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN status DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN status TYPE project_tasks_status_enum
      USING status::text::project_tasks_status_enum
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN status SET DEFAULT 'backlog'
    `);

    await queryRunner.query(`DROP TYPE project_tasks_status_enum_old`);

    await queryRunner.query(CREATE_V_MILESTONE_COMPLETION_V2);
  }
}
